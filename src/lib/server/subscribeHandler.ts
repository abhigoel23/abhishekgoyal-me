// POST /api/subscribe (#109). Same checks as /api/lead (formGuard.ts), then zod → Turnstile → D1 → queue.
// The answer is { ok: true } whether the address is new, pending or already confirmed, so the endpoint
// can't be used to find out who is on the list. POST /api/subscribe/confirm confirms a token.
import { confirmTokenPattern, subscribeSchema, type Subscribe } from '../subscribe';
import { fieldErrors, guardForm, json, type GuardDeps } from './formGuard';
import type { ConfirmResult, SignupResult } from './subscriberStore';

// One email field is quick to fill; still slower than a bot posting on page load.
export const SUBSCRIBE_MIN_FILL_MS = 1_500;

export type SubscribeDeps = GuardDeps & {
  verifyTurnstile: (token: string, ip: string | null) => Promise<boolean>;
  saveSignup: (input: Subscribe, now: Date) => Promise<SignupResult>;
  /** The raw token travels only in the queue message, never in logs or D1. */
  enqueue: (message: { kind: 'subscriber'; id: string; token?: string }) => Promise<void>;
  now: () => Date;
};

export async function handleSubscribe(request: Request, deps: SubscribeDeps): Promise<Response> {
  const now = deps.now();
  const guarded = await guardForm(request, deps, now, {
    minFillMs: SUBSCRIBE_MIN_FILL_MS,
    logPrefix: 'subscribe',
  });
  if (!guarded.ok) return guarded.response;

  const parsed = subscribeSchema.safeParse(guarded.body);
  if (!parsed.success) {
    return json(400, { ok: false, error: 'invalid', fields: fieldErrors(parsed.error.issues) });
  }

  if (!(await deps.verifyTurnstile(guarded.turnstileToken, guarded.ip))) {
    return json(403, { ok: false, error: 'verification_failed' });
  }

  const result = await deps.saveSignup(parsed.data, now);
  if (result.send) {
    // Safe in D1 with a pending step; if enqueueing fails the cron re-sends with a fresh token.
    try {
      await deps.enqueue({ kind: 'subscriber', id: result.subscriberId, token: result.token });
    } catch (error) {
      deps.log('subscribe enqueue failed; cron will re-sync', {
        subscriberId: result.subscriberId,
        error: String(error),
      });
    }
  }
  return json(200, { ok: true });
}

export type ConfirmDeps = {
  rateLimit: (key: string) => Promise<boolean>;
  confirm: (token: string, now: Date) => Promise<ConfirmResult>;
  enqueue: (message: { kind: 'subscriber'; id: string }) => Promise<void>;
  now: () => Date;
  log: (message: string, detail?: unknown) => void;
};

/** POST /api/subscribe/confirm with { token }: the button on /subscribe/confirm, never a plain link. */
export async function handleConfirm(request: Request, deps: ConfirmDeps): Promise<Response> {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return json(403, { ok: false, error: 'forbidden' });
  }
  if (!(await deps.rateLimit(request.headers.get('cf-connecting-ip') ?? 'unknown'))) {
    return json(429, { ok: false, error: 'rate_limited' });
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }
  const raw = await request.text();
  if (raw.length > 1024) return json(413, { ok: false, error: 'too_large' });
  let token: unknown;
  try {
    token = (JSON.parse(raw) as { token?: unknown }).token;
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }
  // Expired, used and unknown tokens all get the same answer.
  if (typeof token !== 'string' || !confirmTokenPattern.test(token)) {
    return json(400, { ok: false, error: 'invalid_token' });
  }
  const result = await deps.confirm(token, deps.now());
  if (!result.ok) return json(400, { ok: false, error: 'invalid_token' });
  try {
    await deps.enqueue({ kind: 'subscriber', id: result.subscriberId });
  } catch (error) {
    deps.log('confirm enqueue failed; cron will re-sync', {
      subscriberId: result.subscriberId,
      error: String(error),
    });
  }
  return json(200, { ok: true });
}
