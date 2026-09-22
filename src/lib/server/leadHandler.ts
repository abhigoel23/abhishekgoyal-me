// POST /api/lead. Order: same-origin → rate limit → size/JSON → honeypot + timing → zod → Turnstile
// → D1 (source of truth) → queue. Turnstile runs after zod so a typo doesn't burn the visitor's token.
// JSON only: Turnstile needs JavaScript, so the form shows an email fallback in <noscript>.
import { z } from 'zod';
import { leadSchema, type Lead } from '../lead';
import type { SaveResult } from './leadStore';

export const MAX_BODY_BYTES = 16 * 1024;
export const MIN_FILL_MS = 3_000;
const MAX_FILL_MS = 24 * 60 * 60 * 1000;

export type LeadDeps = {
  rateLimit: (key: string) => Promise<boolean>; // true = allowed
  verifyTurnstile: (token: string, ip: string | null) => Promise<boolean>;
  saveLead: (lead: Lead, now: Date) => Promise<SaveResult>;
  enqueue: (leadId: string) => Promise<void>;
  now: () => Date;
  log: (message: string, detail?: unknown) => void;
};

// Anti-bot fields sent alongside the lead; never stored.
const botFields = z.object({
  'cf-turnstile-response': z.string().max(2048).default(''),
  website: z.string().default(''), // honeypot: hidden from people, filled by naive bots
  started_at: z.number().int().optional(), // ms epoch when the form was shown
});

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function handleLead(request: Request, deps: LeadDeps): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin !== url.origin) return json(403, { ok: false, error: 'forbidden' });

  const ip = request.headers.get('cf-connecting-ip');
  if (!(await deps.rateLimit(ip ?? 'unknown'))) {
    return json(429, { ok: false, error: 'rate_limited' });
  }

  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'too_large' });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const now = deps.now();
  const bot = botFields.safeParse(body);
  const elapsed = bot.success && bot.data.started_at ? now.getTime() - bot.data.started_at : -1;
  if (!bot.success || bot.data.website !== '' || elapsed < MIN_FILL_MS || elapsed > MAX_FILL_MS) {
    deps.log('lead rejected: bot check', { elapsed });
    return json(400, { ok: false, error: 'rejected' });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const fields = Object.fromEntries(
      parsed.error.issues.map((i) => [i.path.join('.'), i.message]),
    );
    return json(400, { ok: false, error: 'invalid', fields });
  }

  if (!(await deps.verifyTurnstile(bot.data['cf-turnstile-response'], ip))) {
    return json(403, { ok: false, error: 'verification_failed' });
  }

  const { leadId, duplicate } = await deps.saveLead(parsed.data, now);
  if (!duplicate) {
    // The lead is safe in D1 with pending outbox rows; if enqueueing fails the daily cron re-syncs it.
    try {
      await deps.enqueue(leadId);
    } catch (error) {
      deps.log('lead enqueue failed; cron will re-sync', { leadId, error: String(error) });
    }
  }
  return json(200, { ok: true });
}
