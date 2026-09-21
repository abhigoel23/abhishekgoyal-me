import { defineConfig, devices } from '@playwright/test';

// BASE_URL lets CI run the same smoke tests against a preview or production URL.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4321';

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm preview --port 4321',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
