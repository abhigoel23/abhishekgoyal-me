import { expect, test } from '@playwright/test';
import { routes } from './routes';

test('rss.xml is a valid feed and every item link resolves', async ({ page, request }) => {
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/xml/);

  const body = await response.text();

  // Parse with the browser's own DOMParser rather than adding an XML-parsing dependency.
  const parsed = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    const hasChannel = doc.querySelector('rss > channel') !== null;
    const links = [...doc.querySelectorAll('item > link')].map((el) => el.textContent ?? '');
    return { parserError: parserError?.textContent ?? null, hasChannel, links };
  }, body);

  expect(parsed.parserError).toBeNull();
  expect(parsed.hasChannel).toBe(true);

  for (const link of parsed.links) {
    expect(link).toMatch(/^https:\/\/abhishekgoyal\.me\//);
    const itemResponse = await request.get(new URL(link).pathname);
    expect(itemResponse.ok(), link).toBe(true);
  }
});

for (const path of routes) {
  test(`${path} links to the RSS feed`, async ({ page }) => {
    await page.goto(path);
    const alternate = page.locator('head link[rel="alternate"][type="application/rss+xml"]');
    await expect(alternate).toHaveAttribute('href', 'https://abhishekgoyal.me/rss.xml');
  });
}
