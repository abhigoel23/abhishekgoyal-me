import { expect, test } from '@playwright/test';

// Liveness: the Worker is up and can query D1. Every environment binds D1, so a missing binding fails.
// Safe on any URL (read-only).
test('/api/health reports ok', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  const body = await response.json();
  expect(body).toEqual({ ok: true, db: 'ok' });
});
