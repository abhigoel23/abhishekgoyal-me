import { describe, expect, it } from 'vitest';
import { ANALYTICS_HOSTS, CF_BEACON_TOKEN, GA_MEASUREMENT_ID } from './analytics';

describe('analytics ids', () => {
  it('has a real Cloudflare Web Analytics token', () => {
    expect(CF_BEACON_TOKEN).toMatch(/^[0-9a-f]{32}$/);
  });

  it('has a GA4 measurement id, and the live hosts only', () => {
    expect(GA_MEASUREMENT_ID).toMatch(/^G-[A-Z0-9]+$/);
    expect([...ANALYTICS_HOSTS]).toEqual(['abhishekgoyal.me', 'www.abhishekgoyal.me']);
  });
});
