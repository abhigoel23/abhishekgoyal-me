// POST /api/lead. Order: same-origin → rate limit → size/JSON → honeypot + timing (formGuard.ts) → zod
// → Turnstile → D1 (source of truth) → queue. Turnstile runs after zod so a typo doesn't burn the
// visitor's token. JSON only: Turnstile needs JavaScript, so the form shows an email fallback in <noscript>.
import { leadSchema, type Lead } from '../lead';
import { fieldErrors, guardForm, json, type GuardDeps } from './formGuard';
import type { SaveResult } from './leadStore';

export { MAX_BODY_BYTES } from './formGuard';
export const MIN_FILL_MS = 3_000;

export type LeadDeps = GuardDeps & {
  verifyTurnstile: (token: string, ip: string | null) => Promise<boolean>;
  saveLead: (lead: Lead, now: Date) => Promise<SaveResult>;
  enqueue: (leadId: string) => Promise<void>;
  now: () => Date;
};

export async function handleLead(request: Request, deps: LeadDeps): Promise<Response> {
  const now = deps.now();
  const guarded = await guardForm(request, deps, now, {
    minFillMs: MIN_FILL_MS,
    logPrefix: 'lead',
  });
  if (!guarded.ok) return guarded.response;

  const parsed = leadSchema.safeParse(guarded.body);
  if (!parsed.success) {
    return json(400, { ok: false, error: 'invalid', fields: fieldErrors(parsed.error.issues) });
  }

  if (!(await deps.verifyTurnstile(guarded.turnstileToken, guarded.ip))) {
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
