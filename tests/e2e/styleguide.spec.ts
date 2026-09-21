import { expect, test } from '@playwright/test';

const directions = ['editorial', 'studio', 'engineer'];

test('pages are served without a trailing-slash redirect', async ({ request }) => {
  for (const path of ['/styleguide', '/styleguide/studio']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
  }
});

test('comparison page lists every direction and stays out of search', async ({ page }) => {
  await page.goto('/styleguide');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  for (const id of directions)
    await expect(page.locator(`a[href="/styleguide/${id}"]`)).toBeVisible();
});

for (const id of directions) {
  test(`${id} specimen renders without horizontal scroll`, async ({ page }) => {
    const response = await page.goto(`/styleguide/${id}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('data-brand', id);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('theme toggle flips the theme and remembers it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/styleguide/editorial');
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: 'Switch to dark theme' });

  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('styleguide is excluded from the sitemap', async ({ request }) => {
  const index = await request.get('/sitemap-index.xml');
  expect(index.ok()).toBe(true);
  const chunks = [...(await index.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  expect(chunks.length).toBeGreaterThan(0);
  for (const path of chunks) {
    const chunk = await request.get(path);
    expect(chunk.ok()).toBe(true);
    const body = await chunk.text();
    expect(body).toContain('<urlset');
    expect(body).not.toContain('/styleguide');
  }
});
