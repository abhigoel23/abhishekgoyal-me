import type { Page } from '@playwright/test';

/**
 * Replaces Cloudflare's Turnstile script with a stub that hands the form a token at once. For tests
 * that mock the API: against production the real widget runs in Managed mode and gives a headless
 * browser no token, so the form would sit waiting for one (formParts.tsx `useTurnstile`).
 */
export async function stubTurnstile(page: Page) {
  await page.route('https://challenges.cloudflare.com/turnstile/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile = {
        render: (_el, options) => { setTimeout(() => options.callback && options.callback('stub-token')); return 'stub'; },
        reset: () => {},
        remove: () => {},
      };`,
    }),
  );
}
