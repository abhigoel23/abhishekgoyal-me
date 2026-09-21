import { expect, test } from '@playwright/test';

test('work index links to every case study', async ({ page }) => {
  await page.goto('/work');
  for (const slug of ['helperbook', 'pulse', 'video-hiring']) {
    await expect(page.locator(`main a[href="/work/${slug}"]`)).toBeVisible();
  }
});

test('case-study screenshots load with alt text', async ({ page }) => {
  await page.goto('/work/helperbook');
  const images = page.locator('#screens-title ~ ul img');
  await expect(images).toHaveCount(4);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('alt', /.{20,}/);
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test('the NDA case study names no client', async ({ page }) => {
  await page.goto('/work/video-hiring');
  await expect(page.locator('main')).not.toContainText(/hiremeup/i);
});
