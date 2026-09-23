import { expect, test } from '@playwright/test';

const PRODUCTION_HOSTS = ['abhishekgoyal.me', 'www.abhishekgoyal.me'];
const beacon = 'script[src*="static.cloudflareinsights.com"]';

// Cookieless, so it needs no consent — but it must never run outside the live site, or previews and
// local runs would inflate the counts.
test('the Cloudflare beacon loads only on the live site', async ({ page, baseURL }) => {
  const live = !!baseURL && PRODUCTION_HOSTS.includes(new URL(baseURL).hostname);
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
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
