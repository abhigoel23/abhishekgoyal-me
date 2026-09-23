import { expect, test } from '@playwright/test';
import { nav, hireCta, primaryCta } from '../../src/data/nav';

// A nav entry pointing at a route that doesn't exist ships a 404 into the header of every page, which
// is how /writing reached production (caught by the nightly link check, not by these tests).
const links = [...nav, primaryCta, hireCta];

for (const { href, label } of links) {
  test(`the ${label} link (${href}) resolves`, async ({ request }) => {
    const response = await request.get(href);
    expect(response.status()).toBe(200);
  });
}

test('every link in the header and footer resolves', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page
    .locator('header a[href^="/"], footer a[href^="/"]')
    .evaluateAll((anchors) => [
      ...new Set(anchors.map((a) => a.getAttribute('href')!.split('#')[0]!)),
    ]);
  expect(hrefs.length).toBeGreaterThan(3);
  for (const href of hrefs) {
    if (!href) continue;
    expect((await request.get(href)).status(), href).toBe(200);
  }
});
