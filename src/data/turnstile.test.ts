import { describe, expect, it } from 'vitest';
import { PRODUCTION_SITE_KEY, TEST_SITE_KEY, turnstileSiteKey } from './turnstile';

describe('turnstileSiteKey', () => {
  it.each(['abhishekgoyal.me', 'www.abhishekgoyal.me', 'abhishekgoyal-me.abhigoel23.workers.dev'])(
    'uses the production key on %s',
    (host) => expect(turnstileSiteKey(host)).toBe(PRODUCTION_SITE_KEY),
  );

  it.each([
    'localhost',
    '127.0.0.1',
    'abhishekgoyal-me-staging.abhigoel23.workers.dev',
    'pr-12-abhishekgoyal-me-staging.abhigoel23.workers.dev',
    'abhishekgoyal.me.evil.example',
  ])('uses the test key on %s', (host) => expect(turnstileSiteKey(host)).toBe(TEST_SITE_KEY));

  it('has a real production key', () => {
    expect(PRODUCTION_SITE_KEY).toMatch(/^0x[\w-]{20,}$/);
  });
});
