import { expect, test } from '@playwright/test';

test('choosing "A full-time role" reveals the role fields, not the project ones', async ({
  page,
}) => {
  await page.goto('/contact');
  await page.getByRole('radio', { name: 'A full-time role' }).check();
  await expect(page.getByLabel(/^Role title/)).toBeVisible();
  await expect(page.getByLabel(/^What do you need\?/)).toHaveCount(0);
});

test('?path=project pre-selects the project path and its budget follows the currency', async ({
  page,
}) => {
  await page.goto('/contact?path=project');
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
  await page.goto('/contact?path=role');
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Please add your name')).toBeVisible();
  await expect(page.getByLabel(/^Your name/)).toBeFocused();
});

test('a well-formed submission shows the "form unavailable" message (no D1 bindings locally)', async ({
  page,
}) => {
  await page.goto('/contact?path=role');
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
