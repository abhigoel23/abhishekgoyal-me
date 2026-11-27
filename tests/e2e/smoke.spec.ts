import { expect, test } from '@playwright/test';
import { homeCopy, ndaOutcomes } from '../../src/data/home';
import { profile } from '../../src/data/profile';

test('home page renders the hero, sync diagram and client case studies', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Abhishek Goyal/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.positioning);

  // The hero shows the offline-first diagram, not the photo (that's on /about, ADR 007).
  await expect(page.getByRole('img', { name: /Offline-first sync/ })).toBeVisible();
  await expect(page.locator('main img')).toHaveCount(0);

  // Client work only, flagship first: HelperBook and LoveFlix are on /work.
  const cases = page.locator('#work article a[href^="/work/"]');
  await expect(cases).toHaveCount(2);
  await expect(cases.first()).toHaveAttribute('href', '/work/pulse');
  await expect(cases.nth(1)).toHaveAttribute('href', '/work/video-hiring');
});

test('home sections follow the B2B order and keep NDA clients unnamed', async ({ page }) => {
  await page.goto('/');
  const ids = await page
    .locator('main section[id]')
    .evaluateAll((sections) => sections.map((s) => s.id));
  expect(ids.slice(0, 4)).toEqual(['work', 'engagements', 'process', 'credentials']);

  for (const outcome of ndaOutcomes) {
    await expect(page.locator('#work')).toContainText(outcome.value);
  }
  await expect(page.locator('main')).not.toContainText(/hiremeup|redquanta|ezhealth/i);

  await expect(page.locator('#engagements table tbody tr')).toHaveCount(4);
  await expect(page.locator('#process ol > li')).toHaveCount(4);
  for (const credential of profile.credentials) {
    await expect(page.locator('#credentials')).toContainText(credential);
  }
  await expect(page.locator('#credentials h2')).toHaveText(homeCopy.credentials.title);
});

test('the primary CTA opens the contact form', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator('main').getByRole('link', { name: 'Start a project' }).first(),
  ).toHaveAttribute('href', '/contact');
});

test('the photo is on /about', async ({ page }) => {
  await page.goto('/about');
  const photo = page.locator('main img').first();
  await expect(photo).toHaveAttribute('alt', /Abhishek Goyal/);
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});
