// Checks shared by the form endpoints (/api/lead, /api/subscribe) before their own schema runs:
// same-origin → rate limit → JSON only → size → parse → honeypot + fill time.
import { z } from 'zod';

export const MAX_BODY_BYTES = 16 * 1024;
const MAX_FILL_MS = 24 * 60 * 60 * 1000;

export const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// Anti-bot fields sent alongside the form; never stored.
const botFields = z.object({
  'cf-turnstile-response': z.string().max(2048).default(''),
  website: z.string().default(''), // honeypot: hidden from people, filled by naive bots
  started_at: z.number().int().optional(), // ms epoch when the form was shown
});

export type GuardDeps = {
  rateLimit: (key: string) => Promise<boolean>; // true = allowed
  log: (message: string, detail?: unknown) => void;
};

export type Guarded =
  | { ok: true; body: unknown; ip: string | null; turnstileToken: string }
  | { ok: false; response: Response };

/**
 * @param minFillMs submissions faster than this are treated as bots
 * @param logPrefix e.g. "lead", for "lead rejected: bot check"
 */
export async function guardForm(
  request: Request,
  deps: GuardDeps,
  now: Date,
  { minFillMs, logPrefix }: { minFillMs: number; logPrefix: string },
): Promise<Guarded> {
  const fail = (status: number, error: string) => ({
    ok: false as const,
    response: json(status, { ok: false, error }),
  });

  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin) return fail(403, 'forbidden');

  const ip = request.headers.get('cf-connecting-ip');
  if (!(await deps.rateLimit(ip ?? 'unknown'))) return fail(429, 'rate_limited');

  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return fail(415, 'unsupported_media_type');
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return fail(413, 'too_large');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, 'invalid_json');
  }

  const bot = botFields.safeParse(body);
  const elapsed = bot.success && bot.data.started_at ? now.getTime() - bot.data.started_at : -1;
  if (!bot.success || bot.data.website !== '' || elapsed < minFillMs || elapsed > MAX_FILL_MS) {
    deps.log(`${logPrefix} rejected: bot check`, { elapsed });
    return fail(400, 'rejected');
  }
  return { ok: true, body, ip, turnstileToken: bot.data['cf-turnstile-response'] };
}

/** Field errors from zod, keyed by path, for the form to show next to each field. */
export const fieldErrors = (issues: readonly { path: PropertyKey[]; message: string }[]) =>
  Object.fromEntries(issues.map((i) => [i.path.join('.'), i.message]));
