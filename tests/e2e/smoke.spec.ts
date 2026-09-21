import { expect, test } from '@playwright/test';
import { profile } from '../../src/data/profile';

test('home page renders the hero, photo and case studies', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Abhishek Goyal/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.positioning);

  const photo = page.locator('main figure img');
  await expect(photo).toHaveAttribute('alt', /Abhishek Goyal/);
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);

  await expect(page.locator('#work a[href^="/work/"]')).toHaveCount(3);
});

test('the primary CTA opens an email until the M3 contact form exists', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('main').getByRole('link', { name: 'Start a project' }).first(),
  ).toHaveAttribute('href', /^mailto:contact@abhishekgoyal\.me/);
});
