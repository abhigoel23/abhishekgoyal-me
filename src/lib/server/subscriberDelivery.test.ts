import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmTokenPattern } from '../subscribe';
import { confirmationEmail, confirmLink, subscriberHandlers } from './subscriberDelivery';
import { hashToken, newToken, type SubscriberRow } from './subscriberStore';

const TOKEN = 'b'.repeat(43);
const pending = {
  subscriber_id: 's-1',
  email: 'asha@acme.in',
  status: 'pending',
} as SubscriberRow;
const noDb = {} as D1Database;

afterEach(() => vi.restoreAllMocks());

describe('tokens', () => {
  it('are 43 url-safe characters, different every time', () => {
    const a = newToken();
    expect(a).toMatch(confirmTokenPattern);
    expect(newToken()).not.toBe(a);
  });

  it('hash to 64 hex characters, deterministically', async () => {
    expect(await hashToken(TOKEN)).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashToken(TOKEN)).toBe(await hashToken(TOKEN));
  });
});

describe('confirmationEmail', () => {
  it('puts the token in the URL fragment, never the query', () => {
    expect(confirmLink(TOKEN)).toBe(`https://abhishekgoyal.me/subscribe/confirm#t=${TOKEN}`);
    expect(confirmationEmail('asha@acme.in', TOKEN, 'production').text).toContain(
      confirmLink(TOKEN),
    );
  });

  it('goes to the visitor in production and to the inbox elsewhere', () => {
    expect(confirmationEmail('asha@acme.in', TOKEN, 'production').to).toBe('asha@acme.in');
    const staging = confirmationEmail('asha@acme.in', TOKEN, 'staging');
    expect(staging.to).toBe('contact@abhishekgoyal.me');
    expect(staging.subject).toMatch(/^\[staging → asha@acme\.in\] /);
  });
});

describe('subscriberHandlers.confirm_email', () => {
  const env = { ENVIRONMENT: 'production', RESEND_API_KEY: 'k' } as never;

  it('sends with the message token and a per-token idempotency key', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'e' }));
    const step = subscriberHandlers(env, noDb, TOKEN).confirm_email!;
    expect(await step(pending)).toBe('done');
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBe(`s-1:confirm:${(await hashToken(TOKEN)).slice(0, 16)}`);
    expect(JSON.parse(init.body as string).text).toContain(`#t=${TOKEN}`);
  });

  it('skips subscribers who are no longer pending, and test addresses', async () => {
    const step = subscriberHandlers(env, noDb, TOKEN).confirm_email!;
    expect(await step({ ...pending, status: 'confirmed' })).toEqual({ skipped: 'not_pending' });
    expect(await step({ ...pending, email: 'bot@example.com' })).toEqual({
      skipped: 'reserved_email',
    });
  });

  it('fails the step when Resend is not configured', async () => {
    const step = subscriberHandlers(
      { ENVIRONMENT: 'production' } as never,
      noDb,
      TOKEN,
    ).confirm_email!;
    await expect(step(pending)).rejects.toThrow('RESEND_API_KEY not configured');
  });
});
