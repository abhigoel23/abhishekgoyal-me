import { expect, test } from '@playwright/test';

test('robots.txt allows crawling and points to the sitemap', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Sitemap: https://abhishekgoyal.me/sitemap-index.xml');
});

test('every icon linked from the page and the manifest resolves', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page
    .locator('head link[rel="icon"], head link[rel="apple-touch-icon"], head link[rel="manifest"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(hrefs).toEqual(
    expect.arrayContaining([
      '/favicon.ico',
      '/favicon.svg',
      '/apple-touch-icon.png',
      '/site.webmanifest',
    ]),
  );

  const manifest = await (await request.get('/site.webmanifest')).json();
  expect(manifest.name).toBe('Abhishek Goyal');
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(
    true,
  );

  for (const href of [...hrefs, ...manifest.icons.map((icon: { src: string }) => icon.src)]) {
    const response = await request.get(href);
    expect(response.ok(), href).toBe(true);
  }
});
