import { describe, expect, it, vi } from 'vitest';
import { confirmTokenPattern } from '../subscribe';
import {
  handleConfirm,
  handleSubscribe,
  SUBSCRIBE_MIN_FILL_MS,
  type ConfirmDeps,
  type SubscribeDeps,
} from './subscribeHandler';

const NOW = new Date('2026-09-24T10:00:00Z');
const ORIGIN = 'https://abhishekgoyal.me';
const TOKEN = 'A'.repeat(43);

const signup = {
  email: ' Asha@Example.com ',
  consent: true,
  source: 'checklist',
  'cf-turnstile-response': 'turnstile',
  website: '',
  started_at: NOW.getTime() - 5_000,
};

function subscribeDeps(overrides: Partial<SubscribeDeps> = {}) {
  return {
    rateLimit: vi.fn(async () => true),
    verifyTurnstile: vi.fn(async () => true),
    saveSignup: vi.fn(async () => ({ send: true as const, subscriberId: 's-1', token: TOKEN })),
    enqueue: vi.fn(async () => {}),
    now: () => NOW,
    log: vi.fn(),
    ...overrides,
  } satisfies SubscribeDeps;
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'cf-connecting-ip': '203.0.113.9',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function subscribe(body: unknown, d = subscribeDeps(), headers?: Record<string, string>) {
  const res = await handleSubscribe(post('/api/subscribe', body, headers), d);
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, d };
}

describe('handleSubscribe', () => {
  it('saves a valid sign-up (email normalised) and enqueues the confirmation with its token', async () => {
    const { status, body, d } = await subscribe(signup);
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(d.saveSignup).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'asha@example.com', source: 'checklist' }),
      NOW,
    );
    expect(d.enqueue).toHaveBeenCalledWith({ kind: 'subscriber', id: 's-1', token: TOKEN });
  });

  it('answers the same when nothing is sent (already confirmed, or a link sent in the last 24 h)', async () => {
    const d = subscribeDeps({
      saveSignup: vi.fn(async () => ({ send: false as const, subscriberId: 's-1' })),
    });
    const { status, body } = await subscribe(signup, d);
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(d.enqueue).not.toHaveBeenCalled();
  });

  it('still succeeds if enqueueing fails (the cron re-sends), and never logs the token', async () => {
    const d = subscribeDeps({
      enqueue: vi.fn(async () => Promise.reject(new Error('queue down'))),
    });
    const { status } = await subscribe(signup, d);
    expect(status).toBe(200);
    expect(JSON.stringify(vi.mocked(d.log).mock.calls)).not.toContain(TOKEN);
  });

  it('rejects missing consent and bad emails with field errors, before Turnstile', async () => {
    const { status, body, d } = await subscribe({ ...signup, consent: false, email: 'nope' });
    expect(status).toBe(400);
    expect(Object.keys(body.fields as object).sort()).toEqual(['consent', 'email']);
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('rejects an unknown source', async () => {
    expect((await subscribe({ ...signup, source: 'popup' })).status).toBe(400);
  });

  it('applies the shared bot checks: honeypot, too fast, cross-origin, rate limit', async () => {
    expect((await subscribe({ ...signup, website: 'x' })).status).toBe(400);
    const tooFast = NOW.getTime() - SUBSCRIBE_MIN_FILL_MS + 1;
    expect((await subscribe({ ...signup, started_at: tooFast })).status).toBe(400);
    expect((await subscribe(signup, undefined, { origin: 'https://evil.test' })).status).toBe(403);
    const limited = subscribeDeps({ rateLimit: vi.fn(async () => false) });
    expect((await subscribe(signup, limited)).status).toBe(429);
  });

  it('stores nothing when Turnstile fails', async () => {
    const d = subscribeDeps({ verifyTurnstile: vi.fn(async () => false) });
    expect((await subscribe(signup, d)).status).toBe(403);
    expect(d.saveSignup).not.toHaveBeenCalled();
  });
});

function confirmDeps(overrides: Partial<ConfirmDeps> = {}) {
  return {
    rateLimit: vi.fn(async () => true),
    confirm: vi.fn(async () => ({ ok: true as const, subscriberId: 's-1' })),
    enqueue: vi.fn(async () => {}),
    now: () => NOW,
    log: vi.fn(),
    ...overrides,
  } satisfies ConfirmDeps;
}

async function confirm(body: unknown, d = confirmDeps(), headers?: Record<string, string>) {
  const res = await handleConfirm(post('/api/subscribe/confirm', body, headers), d);
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, d };
}

describe('handleConfirm', () => {
  it('confirms a well-formed token and enqueues the confirmed steps (no token in the message)', async () => {
    const { status, d } = await confirm({ token: TOKEN });
    expect(status).toBe(200);
    expect(d.confirm).toHaveBeenCalledWith(TOKEN, NOW);
    expect(d.enqueue).toHaveBeenCalledWith({ kind: 'subscriber', id: 's-1' });
  });

  it('gives expired, used and unknown tokens one answer', async () => {
    const d = confirmDeps({ confirm: vi.fn(async () => ({ ok: false as const })) });
    expect((await confirm({ token: TOKEN }, d)).body).toEqual({
      ok: false,
      error: 'invalid_token',
    });
    expect(d.enqueue).not.toHaveBeenCalled();
  });

  it('rejects malformed tokens without touching the database', async () => {
    for (const token of [undefined, 42, 'short', `${TOKEN}!`, 'A'.repeat(44)]) {
      const { status, d } = await confirm({ token });
      expect(status).toBe(400);
      expect(d.confirm).not.toHaveBeenCalled();
    }
  });

  it('rejects cross-origin, non-JSON and rate-limited requests', async () => {
    expect(
      (await confirm({ token: TOKEN }, undefined, { origin: 'https://evil.test' })).status,
    ).toBe(403);
    expect(
      (
        await confirm(`token=${TOKEN}`, undefined, {
          'content-type': 'application/x-www-form-urlencoded',
        })
      ).status,
    ).toBe(415);
    const limited = confirmDeps({ rateLimit: vi.fn(async () => false) });
    expect((await confirm({ token: TOKEN }, limited)).status).toBe(429);
  });

  it('matches the token format newToken() produces', () => {
    expect(confirmTokenPattern.test(TOKEN)).toBe(true);
  });
});
