// Turnstile site keys are public. The key is picked by hostname in the browser, not at build time, so
// the one build CI tests (on localhost) is the same build that deploys to production.

// Cloudflare's test key: always passes, no UI. Paired with the test secret on staging and in CI.
export const TEST_SITE_KEY = '1x00000000000000000000AA';

// The production widget ("abhishekgoyal.me"), in Managed mode. Its allowed hostnames must match
// PRODUCTION_HOSTS; the matching secret is the production Worker's TURNSTILE_SECRET.
export const PRODUCTION_SITE_KEY = '0x4AAAAAAFAJ7OMe-va70rPq';

export const PRODUCTION_HOSTS = [
  'abhishekgoyal.me',
  'www.abhishekgoyal.me',
  'abhishekgoyal-me.abhigoel23.workers.dev',
] as const;

export function turnstileSiteKey(hostname: string) {
  return (PRODUCTION_HOSTS as readonly string[]).includes(hostname)
    ? PRODUCTION_SITE_KEY
    : TEST_SITE_KEY;
}

/** The widget's `action`, one per form; the endpoint refuses tokens solved for another form. */
export type TurnstileAction = 'lead' | 'subscribe';
