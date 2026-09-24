import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmTokenPattern } from '../subscribe';
import {
  checklistEmail,
  confirmationEmail,
  confirmLink,
  subscriberHandlers,
} from './subscriberDelivery';
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

  it("links to the environment's own origin", () => {
    const staging = 'https://abhishekgoyal-me-staging.abhigoel23.workers.dev';
    expect(confirmationEmail('a@b.in', TOKEN, 'staging', staging).text).toContain(
      `${staging}/subscribe/confirm#t=${TOKEN}`,
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

describe('post-confirm steps', () => {
  const confirmed = {
    ...pending,
    status: 'confirmed',
    confirmed_at: '2026-09-24T10:00:00.000Z',
    source: 'checklist',
    ga_client_id: '123.456',
  } as SubscriberRow;
  const env = {
    ENVIRONMENT: 'production',
    RESEND_API_KEY: 'send-key',
    RESEND_CONTACTS_KEY: 'contacts-key',
    RESEND_SEGMENT_ID: 'seg-1',
    GA_MEASUREMENT_ID: 'G-X',
    GA_MP_API_SECRET: 'mp',
  } as never;

  it('skip everything if the subscriber is no longer confirmed', async () => {
    const steps = subscriberHandlers(env, noDb, undefined);
    const gone = { ...confirmed, status: 'unsubscribed' } as SubscriberRow;
    for (const step of ['sheets', 'audience', 'checklist_email', 'ga'] as const) {
      expect(await steps[step]!(gone)).toEqual({ skipped: 'not_confirmed' });
    }
  });

  it('sends the checklist link, keyed per confirmation', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'e' }));
    expect(await subscriberHandlers(env, noDb, undefined).checklist_email!(confirmed)).toBe('done');
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['idempotency-key']).toBe(
      's-1:checklist:2026-09-24T10:00:00.000Z',
    );
    const email = JSON.parse(init.body as string);
    expect(email.to).toBe('asha@acme.in');
    expect(email.text).toContain(
      'https://abhishekgoyal.me/checklist/offline-first-android-launch-checklist.pdf',
    );
  });

  it('checklist email goes to the inbox outside production', () => {
    const email = checklistEmail('asha@acme.in', 'staging');
    expect(email.to).toBe('contact@abhishekgoyal.me');
    expect(email.subject).toMatch(/^\[staging → asha@acme\.in\] /);
  });

  it('adds the contact with the contacts key, not the sending key', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ id: 'c' }, { status: 201 }));
    expect(await subscriberHandlers(env, noDb, undefined).audience!(confirmed)).toBe('done');
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer contacts-key');
  });

  it('fails the audience step until Resend contacts are configured', async () => {
    const steps = subscriberHandlers({ ENVIRONMENT: 'production' } as never, noDb, undefined);
    await expect(steps.audience!(confirmed)).rejects.toThrow('Resend contacts not configured');
  });

  it('sends sign_up only with analytics consent', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    const steps = subscriberHandlers(env, noDb, undefined);
    expect(await steps.ga!({ ...confirmed, ga_client_id: null })).toEqual({
      skipped: 'no_analytics_consent',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await steps.ga!(confirmed)).toBe('done');
    const payload = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(payload.events[0]).toMatchObject({ name: 'sign_up', params: { method: 'checklist' } });
  });

  it('marks the Sheet only for an unsubscribed subscriber', async () => {
    const steps = subscriberHandlers(env, noDb, undefined);
    expect(await steps.sheet_status!(confirmed)).toEqual({ skipped: 'not_unsubscribed' });
  });
});
