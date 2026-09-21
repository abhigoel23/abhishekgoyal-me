import { expect, test } from '@playwright/test';

// Add each new route here as M2 lands.
const pages = ['/', '/styleguide'];

for (const path of pages) {
  test(`${path} has complete SEO metadata`, async ({ page }) => {
    await page.goto(path);
    const head = page.locator('head');

    await expect(page).toHaveTitle(/Abhishek Goyal/);
    await expect(head.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
    await expect(head.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(head.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://abhishekgoyal.me${path === '/' ? '/' : path}`,
    );
    await expect(head.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(head.locator('meta[name="twitter:card"]')).toHaveCount(1);

    const jsonLd = JSON.parse(
      (await head.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    const person = jsonLd['@graph'].find((node: { '@type': string }) => node['@type'] === 'Person');
    expect(person).toMatchObject({ name: 'Abhishek Goyal', jobTitle: expect.any(String) });
  });
}
