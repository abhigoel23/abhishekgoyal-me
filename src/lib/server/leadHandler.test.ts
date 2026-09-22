import { describe, expect, it, vi } from 'vitest';
import { handleLead, MAX_BODY_BYTES, MIN_FILL_MS, type LeadDeps } from './leadHandler';
import { idempotencyKey } from './leadStore';

const NOW = new Date('2026-09-22T10:00:00Z');
const ORIGIN = 'https://abhishekgoyal.me';

const lead = {
  path: 'role',
  name: 'Ravi',
  email: 'ravi@example.com',
  consent: true,
  company: 'Acme',
  role_title: 'Staff Android Engineer',
  work_mode: 'remote',
  'cf-turnstile-response': 'token',
  website: '',
  started_at: NOW.getTime() - 10_000,
};

function deps(overrides: Partial<LeadDeps> = {}) {
  return {
    rateLimit: vi.fn(async () => true),
    verifyTurnstile: vi.fn(async () => true),
    saveLead: vi.fn(async () => ({ leadId: 'lead-1', duplicate: false })),
    enqueue: vi.fn(async () => {}),
    now: () => NOW,
    log: vi.fn(),
    ...overrides,
  } satisfies LeadDeps;
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/api/lead`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'cf-connecting-ip': '203.0.113.7',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function call(body: unknown, d = deps(), headers?: Record<string, string>) {
  const res = await handleLead(post(body, headers), d);
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, d };
}

describe('handleLead', () => {
  it('saves a valid lead, then enqueues it', async () => {
    const { status, body, d } = await call(lead);
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(d.verifyTurnstile).toHaveBeenCalledWith('token', '203.0.113.7');
    expect(d.saveLead).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ravi@example.com' }),
      NOW,
    );
    expect(d.enqueue).toHaveBeenCalledWith('lead-1');
  });

  it('never stores the anti-bot fields', async () => {
    const { d } = await call(lead);
    const saved = vi.mocked(d.saveLead).mock.calls[0]![0] as Record<string, unknown>;
    expect(saved).not.toHaveProperty('website');
    expect(saved).not.toHaveProperty('cf-turnstile-response');
    expect(saved).not.toHaveProperty('started_at');
  });

  it('does not enqueue a duplicate', async () => {
    const d = deps({ saveLead: vi.fn(async () => ({ leadId: 'lead-1', duplicate: true })) });
    const { status } = await call(lead, d);
    expect(status).toBe(200);
    expect(d.enqueue).not.toHaveBeenCalled();
  });

  it('still succeeds when enqueueing fails, because the lead is already in D1', async () => {
    const d = deps({ enqueue: vi.fn(async () => Promise.reject(new Error('queue down'))) });
    const { status } = await call(lead, d);
    expect(status).toBe(200);
    expect(d.log).toHaveBeenCalled();
  });

  it('rejects cross-origin posts', async () => {
    const { status, d } = await call(lead, deps(), { origin: 'https://evil.example' });
    expect(status).toBe(403);
    expect(d.rateLimit).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited, before reading the body', async () => {
    const d = deps({ rateLimit: vi.fn(async () => false) });
    const { status, body } = await call(lead, d);
    expect(status).toBe(429);
    expect(body.error).toBe('rate_limited');
    expect(d.saveLead).not.toHaveBeenCalled();
  });

  it('rejects non-JSON and oversized bodies', async () => {
    expect(
      (await call('name=x', deps(), { 'content-type': 'application/x-www-form-urlencoded' }))
        .status,
    ).toBe(415);
    expect((await call({ ...lead, message: 'a'.repeat(MAX_BODY_BYTES) })).status).toBe(413);
    expect((await call('{not json')).status).toBe(400);
  });

  it('rejects a filled honeypot', async () => {
    const { status, body, d } = await call({ ...lead, website: 'https://spam.example' });
    expect(status).toBe(400);
    expect(body.error).toBe('rejected');
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('rejects submits that are too fast, missing a start time, or stale', async () => {
    expect((await call({ ...lead, started_at: NOW.getTime() - MIN_FILL_MS + 1 })).status).toBe(400);
    expect((await call({ ...lead, started_at: undefined })).status).toBe(400);
    expect((await call({ ...lead, started_at: NOW.getTime() - 2 * 86_400_000 })).status).toBe(400);
  });

  it('returns field errors from the shared schema without spending the Turnstile token', async () => {
    const { status, body, d } = await call({ ...lead, email: 'nope', company: '' });
    expect(status).toBe(400);
    expect(body).toMatchObject({
      error: 'invalid',
      fields: { email: expect.any(String), company: expect.any(String) },
    });
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('rejects a failed Turnstile check and saves nothing', async () => {
    const d = deps({ verifyTurnstile: vi.fn(async () => false) });
    const { status } = await call(lead, d);
    expect(status).toBe(403);
    expect(d.saveLead).not.toHaveBeenCalled();
  });
});

describe('idempotencyKey', () => {
  const l = { email: 'a@b.co', path: 'project' as const };

  it('is stable within a 10-minute window and changes after it', async () => {
    const a = await idempotencyKey(l, new Date('2026-09-22T10:00:01Z'));
    expect(await idempotencyKey(l, new Date('2026-09-22T10:09:59Z'))).toBe(a);
    expect(await idempotencyKey(l, new Date('2026-09-22T10:10:00Z'))).not.toBe(a);
    expect(await idempotencyKey({ ...l, path: 'role' }, new Date('2026-09-22T10:00:01Z'))).not.toBe(
      a,
    );
  });
});
