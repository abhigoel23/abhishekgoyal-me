import { defineConfig, devices } from '@playwright/test';
import { declinedConsent } from './tests/consent-state';

// Lead-capture e2e (#63). Runs ONLY against a local staging build with a throwaway D1 and no real
// secrets, so successful submissions never reach the real Sheet, inbox or Telegram. Never point this
// at a preview or production URL: the smoke suite (playwright.config.ts) covers those.
// `pnpm test:lead` builds for staging first.
export const PORT = 4322;
export const PERSIST = '.wrangler/e2e-state';

export default defineConfig({
  testDir: 'tests/lead',
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  retries: process.env.CI ? 1 : 0,
  // Tests share one local D1; keep them in order so row counts are predictable.
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    storageState: declinedConsent(`http://localhost:${PORT}`),
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: [
      `rm -rf ${PERSIST}`,
      `wrangler d1 migrations apply DB --env staging --local --persist-to ${PERSIST}`,
      // --test-scheduled: GET /cdn-cgi/handler/scheduled runs the daily cron (local dev only).
      `wrangler dev --port ${PORT} --env-file .dev.vars.example --persist-to ${PERSIST} --test-scheduled`,
    ].join(' && '),
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
