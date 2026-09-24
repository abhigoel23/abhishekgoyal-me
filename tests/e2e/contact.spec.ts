import { expect, test, type Page } from '@playwright/test';

// The form is a client:visible island; Astro drops the `ssr` attribute once it has hydrated. Waiting
// for that keeps these tests stable against remote previews, where the JS arrives over the network.
async function openContact(page: Page, url = '/contact') {
  await page.goto(url);
  await page.locator('astro-island:not([ssr])').first().waitFor();
}

test('choosing "A full-time role" reveals the role fields, not the project ones', async ({
  page,
}) => {
  await openContact(page);
  await page.getByRole('radio', { name: 'A full-time role' }).check();
  await expect(page.getByLabel(/^Role title/)).toBeVisible();
  await expect(page.getByLabel(/^What do you need\?/)).toHaveCount(0);
});

test('?path=project pre-selects the project path and its budget follows the currency', async ({
  page,
}) => {
  await openContact(page, '/contact?path=project');
  await expect(page.getByRole('radio', { name: 'A project for my product or team' })).toBeChecked();
  await expect(page.getByLabel(/^Tell me about the project/)).toBeVisible();

  const budget = page.getByLabel(/^Budget/);
  await expect(budget.getByRole('option', { name: 'Under $5k' })).toHaveCount(1);
  await page.getByRole('radio', { name: 'INR (₹)' }).check();
  await expect(budget.getByRole('option', { name: 'Under ₹4L' })).toHaveCount(1);
  await expect(budget.getByRole('option', { name: 'Under $5k' })).toHaveCount(0);
});

test('submitting an incomplete role enquiry shows accessible errors and focuses the first one', async ({
  page,
}) => {
  await openContact(page, '/contact?path=role');
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Please add your name')).toBeVisible();
  await expect(page.getByLabel(/^Your name/)).toBeFocused();
});

test('a well-formed submission shows the "form unavailable" message when the API returns 503', async ({
  page,
}) => {
  // Mocked: against a staging preview the real API would store a lead. Real submissions are covered
  // by tests/e2e/lead.spec.ts (#63).
  await page.route('**/api/lead', (route) =>
    route.fulfill({ status: 503, json: { ok: false, error: 'unavailable' } }),
  );
  await openContact(page, '/contact?path=role');
  await page.getByLabel(/^Your name/).fill('Ada Lovelace');
  await page.getByLabel(/^Email/).fill('ada@example.com');
  await page.getByLabel(/^Company/).fill('Acme');
  await page.getByLabel(/^Role title/).fill('Staff Mobile Engineer');
  await page.getByLabel(/^How is the role set up\?/).selectOption({ label: 'Remote' });
  await page.getByLabel(/^I agree to be contacted/).check();
  await page.getByRole('button', { name: 'Send enquiry' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    "The form isn't available right now. Email contact@abhishekgoyal.me instead.",
  );
});

test('"Just following along" swaps the enquiry for an email-only sign-up', async ({ page }) => {
  let body: Record<string, unknown> = {};
  await page.route('**/api/subscribe', (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: { ok: true } });
  });
  await openContact(page);
  await page.getByRole('radio', { name: 'Just following along' }).check();
  await expect(page.getByLabel(/^Your name/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send enquiry' })).toHaveCount(0);

  await page.getByRole('textbox', { name: /^Email/ }).fill('ada@example.com');
  await page.getByLabel(/^Email me the checklist/).check();
  await page.getByRole('button', { name: 'Email me the checklist' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox to confirm' })).toBeVisible();
  expect(body).toMatchObject({ email: 'ada@example.com', source: 'lead_form' });
});

test('?path=following pre-selects the sign-up, and switching back restores the enquiry', async ({
  page,
}) => {
  await openContact(page, '/contact?path=following');
  await expect(page.getByRole('radio', { name: 'Just following along' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Email me the checklist' })).toBeVisible();
  await page.getByRole('radio', { name: 'A full-time role' }).check();
  await expect(page.getByLabel(/^Role title/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Email me the checklist' })).toHaveCount(0);
});
