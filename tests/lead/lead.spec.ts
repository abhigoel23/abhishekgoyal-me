import { expect, test, type Page } from '@playwright/test';
import { PORT } from '../../playwright.lead.config';
import { count } from './d1';

const ORIGIN = `http://localhost:${PORT}`;
// The rate limiter keys on cf-connecting-ip (set by Cloudflare in production, where clients can't
// spoof it). Locally each test uses its own address so the flood test doesn't starve the others.
let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter}`;

const MIN_FILL_MS = 3_100;
const TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'; // accepted by Cloudflare's always-pass test secret

function apiLead(overrides: Record<string, unknown> = {}) {
  return {
    path: 'role',
    name: 'E2E Role',
    email: `role-${Date.now()}@example.com`,
    consent: true,
    company: 'Acme',
    role_title: 'Staff Engineer',
    work_mode: 'remote',
    'cf-turnstile-response': TEST_TOKEN,
    website: '',
    started_at: Date.now() - 10_000,
    ...overrides,
  };
}

/** Give this page's /api/lead calls their own client IP. */
async function isolateIp(page: Page) {
  const ip = nextIp();
  await page.route('**/api/lead', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': ip } }),
  );
}

async function openContact(page: Page, url = '/contact') {
  await isolateIp(page);
  await page.goto(url);
  await page.locator('astro-island:not([ssr])').first().waitFor();
}

test('a project enquiry is saved and lands on /thanks', async ({ page }) => {
  const email = `project-${Date.now()}@example.com`;
  await openContact(page, '/contact?path=project');
  await page.getByLabel(/^Your name/).fill('E2E Project');
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^What do you need\?/).selectOption({ label: 'MVP build' });
  await page.getByRole('radio', { name: 'INR (₹)' }).check();
  await page.getByLabel(/^Budget/).selectOption({ label: '₹4L–12L' });
  await page.getByLabel(/^Timeline/).selectOption({ label: 'In 1–3 months' });
  await page.getByLabel(/^Tell me about the project/).fill('=1+1 A booking app');
  await page.getByLabel(/^I agree to be contacted/).check();
  await page.waitForTimeout(MIN_FILL_MS); // the server rejects submits faster than 3 s
  await page.getByRole('button', { name: 'Send enquiry' }).click();

  await expect(page).toHaveURL(/\/thanks\?path=project$/);
  expect(
    count(`SELECT count(*) FROM leads WHERE email = '${email}' AND budget = 'inr-4-12l'`),
  ).toBe(1);
  // Stored exactly as typed; the Sheet copy is escaped at delivery time.
  expect(
    count(`SELECT count(*) FROM leads WHERE email = '${email}' AND message = '=1+1 A booking app'`),
  ).toBe(1);
  expect(
    count(
      `SELECT count(*) FROM outbox_status o JOIN leads l ON l.lead_id = o.ref_id WHERE l.email = '${email}'`,
    ),
  ).toBe(5);
});

test('a role enquiry is saved and lands on /thanks', async ({ page }) => {
  const email = `role-ui-${Date.now()}@example.com`;
  await openContact(page, '/contact?path=role');
  await page.getByLabel(/^Your name/).fill('E2E Role');
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Company/).fill('Acme');
  await page.getByLabel(/^Role title/).fill('Staff Mobile Engineer');
  await page.getByLabel(/^How is the role set up\?/).selectOption({ label: 'Remote' });
  await page.getByLabel(/^I agree to be contacted/).check();
  await page.waitForTimeout(MIN_FILL_MS);
  await page.getByRole('button', { name: 'Send enquiry' }).click();

  await expect(page).toHaveURL(/\/thanks\?path=role$/);
  expect(count(`SELECT count(*) FROM leads WHERE email = '${email}' AND path = 'role'`)).toBe(1);
});

test.describe('the API rejects bots and bad input, storing nothing', () => {
  const post = (
    request: import('@playwright/test').APIRequestContext,
    data: unknown,
    headers: Record<string, string> = {},
  ) =>
    request.post('/api/lead', {
      headers: { origin: ORIGIN, 'cf-connecting-ip': nextIp(), ...headers },
      data,
    });

  test('honeypot filled', async ({ request }) => {
    const lead = apiLead({ website: 'https://spam.example' });
    const res = await post(request, lead);
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'rejected' });
    expect(count(`SELECT count(*) FROM leads WHERE email = '${lead.email}'`)).toBe(0);
  });

  test('submitted faster than a person could', async ({ request }) => {
    const lead = apiLead({ started_at: Date.now() - 500 });
    expect((await post(request, lead)).status()).toBe(400);
    expect(count(`SELECT count(*) FROM leads WHERE email = '${lead.email}'`)).toBe(0);
  });

  test('invalid fields come back per field', async ({ request }) => {
    const res = await post(request, apiLead({ email: 'nope', company: '' }));
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({
      error: 'invalid',
      fields: { email: expect.any(String), company: expect.any(String) },
    });
  });

  test('cross-origin and non-JSON posts', async ({ request }) => {
    expect((await post(request, apiLead(), { origin: 'https://evil.example' })).status()).toBe(403);
    const form = await request.post('/api/lead', {
      headers: { origin: ORIGIN, 'cf-connecting-ip': nextIp() },
      form: { name: 'x' },
    });
    // Astro's own cross-site form guard or our 415: either way, never accepted.
    expect([403, 415]).toContain(form.status());
  });
});

test('a double submit stores one lead', async ({ request }) => {
  const lead = apiLead();
  const headers = { origin: ORIGIN, 'cf-connecting-ip': nextIp() };
  expect((await request.post('/api/lead', { headers, data: lead })).status()).toBe(200);
  expect((await request.post('/api/lead', { headers, data: lead })).status()).toBe(200);
  expect(count(`SELECT count(*) FROM leads WHERE email = '${lead.email}'`)).toBe(1);
});

test('a flood from one address gets 429 after 5 requests a minute', async ({ request }) => {
  const headers = { origin: ORIGIN, 'cf-connecting-ip': nextIp() };
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    statuses.push((await request.post('/api/lead', { headers, data: {} })).status());
  }
  expect(statuses.slice(0, 5)).not.toContain(429);
  expect(statuses[5]).toBe(429);
});

// Playwright's javaScriptEnabled:false stops scripts but Chromium still parses <noscript> as if
// scripting were on, so check the served HTML instead of the rendered page.
test('without JavaScript, /contact offers the email address instead', async ({ request }) => {
  const html = await (await request.get('/contact')).text();
  const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? '';
  expect(noscript).toContain('This form needs JavaScript.');
  expect(noscript).toContain('href="mailto:contact@abhishekgoyal.me"');
});
