import { expect, test, type Page } from '@playwright/test';

const PRODUCTION_HOSTS = ['abhishekgoyal.me', 'www.abhishekgoyal.me'];
const beacon = 'script[src*="static.cloudflareinsights.com"]';

/** Stubs the beacon script so a run against production never reaches Cloudflare. */
async function stubBeacon(page: Page) {
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
}

// Cookieless, so it needs no consent — but it must never run outside the live site, or for automated
// browsers like this one, or previews, local runs and CI would inflate the counts.
test('the Cloudflare beacon never loads for an automated browser', async ({ page }) => {
  await stubBeacon(page);
  await page.goto('/');
  await page.waitForTimeout(500);
  await expect(page.locator(beacon)).toHaveCount(0);
});

test('the Cloudflare beacon loads for people on the live site only', async ({ page, baseURL }) => {
  const live = !!baseURL && PRODUCTION_HOSTS.includes(new URL(baseURL).hostname);
  // Look like a person: Playwright sets navigator.webdriver, which keeps the beacon off.
  await page.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }),
  );
  await stubBeacon(page);
  await page.goto('/');

  if (live) {
    await expect(page.locator(beacon)).toHaveCount(1);
    const token = await page.locator(beacon).getAttribute('data-cf-beacon');
    expect(JSON.parse(token!).token).toMatch(/^[0-9a-f]{32}$/);
  } else {
    await page.waitForTimeout(500);
    await expect(page.locator(beacon)).toHaveCount(0);
  }
});
