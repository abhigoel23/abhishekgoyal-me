import { expect, test } from '@playwright/test';

// Only meaningful against a deployed workers.dev URL (BASE_URL); local runs skip it.
test('workers.dev hosts are noindex', async ({ request, baseURL }) => {
  test.skip(!baseURL?.includes('.workers.dev'), 'not a workers.dev host');
  const response = await request.get('/');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
});
