// Newsletter double opt-in (#109), against the local staging build and its throwaway D1. The raw token
// only ever exists in the email, so the tests plant a known token's hash in D1 and open its link.
import { createHash, randomBytes } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { PORT } from '../../playwright.lead.config';
import { count, query } from './d1';

const ORIGIN = `http://localhost:${PORT}`;
const TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'; // accepted by Cloudflare's always-pass test secret
let ipCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter}`;

const newEmail = (label: string) => `sub-${label}-${Date.now()}@example.com`;
const newToken = () => randomBytes(32).toString('base64url');
const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

function signup(
  request: APIRequestContext,
  email: string,
  overrides: Record<string, unknown> = {},
) {
  return request.post('/api/subscribe', {
    headers: { origin: ORIGIN, 'cf-connecting-ip': nextIp() },
    data: {
      email,
      consent: true,
      source: 'checklist',
      'cf-turnstile-response': TEST_TOKEN,
      website: '',
      started_at: Date.now() - 10_000,
      ...overrides,
    },
  });
}

/** Gives the subscriber a token we know, as if we had the confirmation email. */
function plantToken(email: string, token: string, expiresAt = '2099-01-01T00:00:00.000Z') {
  query(
    `UPDATE subscribers SET confirm_token_hash = '${sha256(token)}', token_expires_at = '${expiresAt}'
     WHERE email = '${email}'`,
  );
}

const statusOf = (email: string) =>
  query<{ status: string }>(`SELECT status FROM subscribers WHERE email = '${email}'`)[0]?.status;

test('a sign-up is saved as pending with a confirmation step; a repeat answers the same', async ({
  request,
}) => {
  const email = newEmail('pending');
  for (let i = 0; i < 2; i++) {
    const res = await signup(request, email);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  }
  expect(count(`SELECT count(*) FROM subscribers WHERE email = '${email}'`)).toBe(1);
  expect(statusOf(email)).toBe('pending');
  expect(
    count(
      `SELECT count(*) FROM outbox_status o JOIN subscribers s ON o.ref_id = s.subscriber_id
       WHERE s.email = '${email}' AND o.ref_kind = 'subscriber' AND o.step = 'confirm_email'`,
    ),
  ).toBe(1);
});

test('opening the link confirms nothing; the button confirms once and clears the token', async ({
  page,
  request,
}) => {
  const email = newEmail('confirm');
  await signup(request, email);
  const token = newToken();
  plantToken(email, token);

  await page.goto(`/subscribe/confirm#t=${token}`);
  await expect(page.getByRole('button', { name: 'Confirm my email' })).toBeEnabled();
  expect(page.url()).not.toContain('#'); // the token is gone from the address bar
  expect(statusOf(email)).toBe('pending'); // a mail scanner opening the link changes nothing

  await page.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(page.getByRole('heading', { name: "You're confirmed" })).toBeVisible();
  expect(statusOf(email)).toBe('confirmed');
  const [row] = query<{ confirm_token_hash: string | null }>(
    `SELECT confirm_token_hash FROM subscribers WHERE email = '${email}'`,
  );
  expect(row!.confirm_token_hash).toBeNull();
  // The steps that run once confirmed (their handlers arrive in #110).
  expect(
    count(
      `SELECT count(*) FROM outbox_status o JOIN subscribers s ON o.ref_id = s.subscriber_id
       WHERE s.email = '${email}' AND o.step IN ('sheets', 'audience', 'checklist_email', 'ga')`,
    ),
  ).toBe(4);

  // The same link again: already used. (Leave the page first: a fragment-only change doesn't reload.)
  await page.goto('about:blank');
  await page.goto(`/subscribe/confirm#t=${token}`);
  await page.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(page.getByRole('heading', { name: /expired or was already used/ })).toBeVisible();

  // Signing up again once confirmed answers the same and changes nothing.
  expect((await signup(request, email)).status()).toBe(200);
  expect(statusOf(email)).toBe('confirmed');
});

test('an expired or missing token shows the expired page', async ({ page, request }) => {
  const email = newEmail('expired');
  await signup(request, email);
  const token = newToken();
  plantToken(email, token, '2000-01-01T00:00:00.000Z');

  await page.goto(`/subscribe/confirm#t=${token}`);
  await page.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(page.getByRole('heading', { name: /expired or was already used/ })).toBeVisible();
  expect(statusOf(email)).toBe('pending');

  await page.goto('/subscribe/confirm');
  await expect(page.getByRole('heading', { name: /expired or was already used/ })).toBeVisible();
});

test('bots and bad input are rejected, storing nothing', async ({ request }) => {
  const email = newEmail('bot');
  expect((await signup(request, email, { website: 'spam' })).status()).toBe(400);
  expect((await signup(request, email, { consent: false })).status()).toBe(400);
  expect((await signup(request, email, { source: 'popup' })).status()).toBe(400);
  const crossOrigin = await request.post('/api/subscribe', {
    headers: { origin: 'https://evil.test' },
    data: { email, consent: true, source: 'checklist' },
  });
  expect(crossOrigin.status()).toBe(403);
  expect(count(`SELECT count(*) FROM subscribers WHERE email = '${email}'`)).toBe(0);
});
