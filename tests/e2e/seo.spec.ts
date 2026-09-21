import { expect, test } from '@playwright/test';
import { routes as pages } from './routes';

for (const path of pages) {
  test(`${path} has complete SEO metadata`, async ({ page, request }) => {
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
    await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );

    const ogImage = await head.locator('meta[property="og:image"]').getAttribute('content');
    const image = await request.get(new URL(ogImage ?? '').pathname);
    expect(image.ok(), ogImage ?? 'og:image').toBe(true);
    expect(image.headers()['content-type']).toBe('image/png');

    const jsonLd = JSON.parse(
      (await head.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    const person = jsonLd['@graph'].find((node: { '@type': string }) => node['@type'] === 'Person');
    expect(person).toMatchObject({ name: 'Abhishek Goyal', jobTitle: expect.any(String) });
  });
}
