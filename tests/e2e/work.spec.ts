import { expect, test } from '@playwright/test';

test('work index groups every case study by kind', async ({ page }) => {
  await page.goto('/work');
  const sections = {
    'client-work': ['pulse', 'video-hiring'],
    'own-products': ['helperbook'],
    prototypes: ['loveflix'],
  };
  for (const [id, slugs] of Object.entries(sections)) {
    const section = page.locator(`main section#${id}`);
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(section.locator('a[href^="/work/"]')).toHaveCount(slugs.length);
    for (const slug of slugs) {
      await expect(section.locator(`a[href="/work/${slug}"]`)).toBeVisible();
    }
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
