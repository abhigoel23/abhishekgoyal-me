import { expect, test } from '@playwright/test';

test('unknown paths return 404 with the branded page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page doesn’t exist.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('main a[href="/work"]')).toBeVisible();
});

test('every page links to the privacy policy', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
});
