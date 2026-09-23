import { expect, test } from '@playwright/test';

const PRODUCTION_HOSTS = ['abhishekgoyal.me', 'www.abhishekgoyal.me'];
const isProduction = (baseURL?: string) =>
  !!baseURL && PRODUCTION_HOSTS.includes(new URL(baseURL).hostname);

// Only meaningful against a deployed workers.dev URL (BASE_URL); local runs skip it.
test('workers.dev hosts are noindex', async ({ request, baseURL }) => {
  test.skip(!baseURL?.includes('.workers.dev'), 'not a workers.dev host');
  const response = await request.get('/');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
});

// The mirror image: public/_headers must never send noindex on the real domain, or the site would
// quietly drop out of search results.
test('the custom domain is indexable', async ({ request, baseURL }) => {
  test.skip(!isProduction(baseURL), 'not the custom domain');
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.headers()['x-robots-tag']).toBeUndefined();
});

test('www redirects to the bare domain, keeping the path and query', async ({
  request,
  baseURL,
}) => {
  test.skip(!isProduction(baseURL), 'not the custom domain');
  const response = await request.get('https://www.abhishekgoyal.me/work?utm_source=test', {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(301);
  expect(response.headers()['location']).toBe('https://abhishekgoyal.me/work?utm_source=test');
});

test('the old /index.html URL redirects permanently to the home page', async ({ request }) => {
  const response = await request.get('/index.html', { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(new URL(response.headers()['location']!, 'https://x.invalid').pathname).toBe('/');
});
