import { expect, test } from '@playwright/test';

test('styleguide renders, stays out of search and has no horizontal scroll', async ({ page }) => {
  const response = await page.goto('/styleguide');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Styleguide');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('pages are served without a trailing-slash redirect', async ({ request }) => {
  const response = await request.get('/styleguide', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});

test('theme toggle flips the theme and remembers it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/styleguide');
  const html = page.locator('html');

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
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
