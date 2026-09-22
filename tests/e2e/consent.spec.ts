import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// The other e2e specs start pre-declined (playwright.config.ts, tests/consent-state.ts) so the bar
// never covers other UI and no spec accidentally loads GA. This spec is about the bar itself, so it
// opts back in to a clean, unset choice.
test.use({ storageState: { cookies: [], origins: [] } });

const GOOGLE_HOSTS = /https:\/\/(www\.)?(googletagmanager|google-analytics)\.com\//;

/** Intercepts every request to Google's analytics hosts, records it, and never lets it hit the network. */
async function watchGoogleRequests(routable: Page | BrowserContext): Promise<string[]> {
  const urls: string[] = [];
  await routable.route(GOOGLE_HOSTS, async (route) => {
    urls.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  return urls;
}

/** dataLayer entries are `Arguments` objects (gtag.js reads them itself); flatten to real arrays. */
function dataLayerEntries(page: Page): Promise<unknown[][]> {
  return page.evaluate(
    () =>
      ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((args) =>
        Array.from(args),
      ) as unknown[][],
  );
}

function readStoredConsent(page: Page): Promise<{ choice?: string; at?: number } | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('consent');
    return raw ? JSON.parse(raw) : null;
  });
}

test('first visit shows the bar with two equal-weight buttons and makes no request to Google', async ({
  page,
}) => {
  const googleRequests = await watchGoogleRequests(page);
  await page.goto('/');

  const bar = page.getByRole('region', { name: 'Analytics cookies' });
  await expect(bar).toBeVisible();

  const decline = page.getByRole('button', { name: 'Decline' });
  const accept = page.getByRole('button', { name: 'Accept' });
  await expect(decline).toBeVisible();
  await expect(accept).toBeVisible();

  const [declineBox, acceptBox] = await Promise.all([decline.boundingBox(), accept.boundingBox()]);
  expect(declineBox).not.toBeNull();
  expect(acceptBox).not.toBeNull();
  expect(Math.abs(declineBox!.width - acceptBox!.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(declineBox!.height - acceptBox!.height)).toBeLessThanOrEqual(2);

  expect(googleRequests).toEqual([]);
});

test('declining hides the bar, is remembered across reloads and pages, and never calls Google', async ({
  page,
}) => {
  const googleRequests = await watchGoogleRequests(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Decline' }).click();
  await expect(page.locator('#consent-bar')).toBeHidden();
  await expect.poll(() => readStoredConsent(page)).toMatchObject({ choice: 'denied' });

  await page.reload();
  await expect(page.locator('#consent-bar')).toBeHidden();

  await page.goto('/services');
  await expect(page.locator('#consent-bar')).toBeHidden();

  expect(googleRequests).toEqual([]);
});

test('accepting on a non-production host hides the bar, stores the choice, but never loads gtag', async ({
  page,
  baseURL,
}) => {
  const hostname = new URL(baseURL ?? 'http://localhost:4321').hostname;
  test.skip(
    hostname === 'abhishekgoyal.me' || hostname === 'www.abhishekgoyal.me',
    'production host: covered by the spoofed-hostname test below',
  );

  const googleRequests = await watchGoogleRequests(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.locator('#consent-bar')).toBeHidden();
  await expect.poll(() => readStoredConsent(page)).toMatchObject({ choice: 'granted' });

  // Give any (wrongly) queued load a moment to happen before asserting its absence.
  await page.waitForTimeout(500);
  expect(googleRequests).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { gtag?: unknown }).gtag)).toBeUndefined();
});

test.describe('production-host behaviour (local build only)', () => {
  test.skip(
    !!process.env.BASE_URL,
    'only meaningful when serving the local build under the prod host',
  );

  // Serves http://abhishekgoyal.me/** by fetching the same path from the local base URL and fulfilling
  // with that response, so `location.hostname` is genuinely the production host without any real DNS
  // resolution of abhishekgoyal.me ever happening.
  async function serveLocalBuildAsProdHost(context: BrowserContext, localBase: string) {
    await context.route('http://abhishekgoyal.me/**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const target = new URL(requestUrl.pathname + requestUrl.search, localBase).toString();
      const response = await route.fetch({ url: target });
      await route.fulfill({ response });
    });
  }

  test('accepting loads gtag exactly once with consent defaults, then an analytics-only grant', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const googleRequests = await watchGoogleRequests(context);
    await serveLocalBuildAsProdHost(context, baseURL ?? 'http://localhost:4321');

    await page.goto('http://abhishekgoyal.me/');
    expect(await page.evaluate(() => location.hostname)).toBe('abhishekgoyal.me');
    expect(googleRequests).toEqual([]);

    await page.getByRole('button', { name: 'Accept' }).click();
    // `watchGoogleRequests` already records matching requests as they happen, so poll the array rather
    // than `page.waitForRequest`, whose listener attaches after `.click()` resolves and can race-miss a
    // request fired by the synchronously-appended <script> tag.
    await expect.poll(() => googleRequests.some((url) => url.includes('gtag/js'))).toBe(true);

    const gtagRequests = googleRequests.filter((url) => url.includes('gtag/js'));
    expect(gtagRequests).toHaveLength(1);
    expect(gtagRequests[0]).toContain('id=G-PHG39RRGSZ');

    const entries = await dataLayerEntries(page);
    const defaultEntry = entries.find((e) => e[0] === 'consent' && e[1] === 'default');
    expect(defaultEntry?.[2]).toMatchObject({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    const updateEntry = entries.find((e) => e[0] === 'consent' && e[1] === 'update');
    expect(updateEntry?.[2]).toEqual({ analytics_storage: 'granted' });

    const configEntry = entries.find((e) => e[0] === 'config');
    expect(configEntry?.[2]).toMatchObject({ allow_google_signals: false });

    await context.close();
  });

  test('?internal=1 marks the gtag config as internal traffic', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const googleRequests = await watchGoogleRequests(context);
    await serveLocalBuildAsProdHost(context, baseURL ?? 'http://localhost:4321');

    await page.goto('http://abhishekgoyal.me/?internal=1');
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect.poll(() => googleRequests.some((url) => url.includes('gtag/js'))).toBe(true);

    const entries = await dataLayerEntries(page);
    const configEntry = entries.find((e) => e[0] === 'config');
    expect(configEntry?.[2]).toMatchObject({ traffic_type: 'internal' });

    await context.close();
  });

  test('withdrawing consent after accepting removes GA cookies', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const googleRequests = await watchGoogleRequests(context);
    await serveLocalBuildAsProdHost(context, baseURL ?? 'http://localhost:4321');

    await page.goto('http://abhishekgoyal.me/');
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect.poll(() => googleRequests.some((url) => url.includes('gtag/js'))).toBe(true);

    await page.evaluate(() => {
      document.cookie = '_ga=GA1.1.111.222; path=/';
      document.cookie = '_ga_PHG39RRGSZ=GS1.1.xyz; path=/';
    });
    expect(await page.evaluate(() => document.cookie)).toContain('_ga=');

    await page.getByRole('button', { name: 'Cookie settings' }).click();
    await expect(page.locator('#consent-bar')).toBeVisible();
    await page.getByRole('button', { name: 'Decline' }).click();

    await expect.poll(() => page.evaluate(() => document.cookie)).not.toContain('_ga');

    await context.close();
  });
});

test('the footer "Cookie settings" button reopens the bar and focuses Decline', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline' }).click();
  await expect(page.locator('#consent-bar')).toBeHidden();

  await page.getByRole('button', { name: 'Cookie settings' }).click();
  await expect(page.locator('#consent-bar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Decline' })).toBeFocused();
});

test('the home page has no serious accessibility violations with the consent bar open', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#consent-bar')).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
  expect(serious).toEqual([]);
});
