import { expect, test, type Page } from '@playwright/test';
import { stubTurnstile } from './turnstile';
import { checklist, checklistBand, checklistPage, checklistPdf } from '../../src/data/checklist';
import { newsletterCopy } from '../../src/data/subscribe';

// Safe on any URL: sign-ups are mocked here. Real ones, against the local staging build, are in
// tests/lead/subscribe.spec.ts.

async function openChecklist(page: Page) {
  await page.goto('/checklist');
  // client:visible: on phones the form sits below the fold and hydrates once scrolled to.
  await page.locator('#checklist-signup').scrollIntoViewIfNeeded();
  await page.locator('astro-island:not([ssr])').first().waitFor();
}

test('/checklist renders the landing page and the sign-up form', async ({ page }) => {
  await openChecklist(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(checklistPage.title);
  for (const section of checklist.sections) {
    await expect(page.getByText(section.title, { exact: true })).toBeVisible();
  }
  const signup = page.locator('#checklist-signup');
  await expect(signup).toContainText(checklistPage.formNote);
  await expect(signup.getByRole('textbox', { name: /^Email/ })).toBeVisible();
  await expect(signup.getByRole('button', { name: newsletterCopy.submit })).toBeVisible();
});

test('the sign-up form explains what is missing', async ({ page }) => {
  await openChecklist(page);
  await page.getByRole('button', { name: newsletterCopy.submit }).click();
  await expect(page.getByText('Please add a valid email address')).toBeVisible();
  await expect(page.getByText('Please agree so I can email you')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Email/ })).toBeFocused();
});

test('a sign-up shows "Check your inbox to confirm" and posts the checklist source', async ({
  page,
}) => {
  let body: Record<string, unknown> = {};
  await stubTurnstile(page);
  await page.route('**/api/subscribe', (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: { ok: true } });
  });
  await openChecklist(page);
  await page.getByRole('textbox', { name: /^Email/ }).fill('ada@example.com');
  await page.getByLabel(/^Email me the checklist/).check();
  await page.getByRole('button', { name: newsletterCopy.submit }).click();

  const status = page.getByRole('status');
  await expect(status.getByRole('heading')).toHaveText(newsletterCopy.success.heading);
  await expect(status).toContainText('ada@example.com');
  await expect(status.getByRole('heading')).toBeFocused();
  expect(body).toMatchObject({ email: 'ada@example.com', consent: true, source: 'checklist' });
  expect(body.website).toBe(''); // the honeypot travels with the payload
});

test('an error from the endpoint is shown, and the form stays', async ({ page }) => {
  await stubTurnstile(page);
  await page.route('**/api/subscribe', (route) =>
    route.fulfill({ status: 429, json: { ok: false, error: 'rate_limited' } }),
  );
  await openChecklist(page);
  await page.getByRole('textbox', { name: /^Email/ }).fill('ada@example.com');
  await page.getByLabel(/^Email me the checklist/).check();
  await page.getByRole('button', { name: newsletterCopy.submit }).click();
  await expect(page.getByRole('alert')).toHaveText(newsletterCopy.errors.rateLimited);
  await expect(page.getByRole('textbox', { name: /^Email/ })).toHaveValue('ada@example.com');
});

test('/checklist is indexable and in the sitemap; /checklist/print is neither', async ({
  page,
  request,
}) => {
  await page.goto('/checklist');
  await expect(page.locator('head meta[name="robots"]')).toHaveCount(0);
  await page.goto('/checklist/print');
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );

  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).toMatch(/\/checklist<\/loc>/);
  expect(sitemap).not.toContain('/checklist/print');
});

test('the footer links to /checklist on other pages, but not on /checklist itself', async ({
  page,
}) => {
  await page.goto('/');
  const band = page.getByRole('contentinfo').getByRole('link', { name: checklistBand.link });
  await expect(band).toHaveAttribute('href', '/checklist');
  await expect(band).toHaveAttribute('data-cta', 'footer_checklist');
  await page.goto('/checklist');
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: checklistBand.link }),
  ).toHaveCount(0);
});

test('the checklist PDF is served, non-trivial and noindex', async ({ request }) => {
  const response = await request.get(checklistPdf);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
  expect(body.length).toBeGreaterThan(20 * 1024);
});
