import { describe, expect, it } from 'vitest';
import { CONSENT_MAX_AGE_DAYS } from '../data/analytics';
import { flagFromQuery, gaCookieNames, readConsent, shouldLoadGa, writeConsent } from './consent';

const now = Date.UTC(2026, 8, 22);
const DAY = 24 * 60 * 60 * 1000;

describe('readConsent', () => {
  it('round-trips a choice', () => {
    expect(readConsent(writeConsent('granted', now), now)).toBe('granted');
    expect(readConsent(writeConsent('denied', now), now + DAY)).toBe('denied');
  });

  it('asks again once the choice expires', () => {
    const raw = writeConsent('granted', now);
    expect(readConsent(raw, now + CONSENT_MAX_AGE_DAYS * DAY)).toBe('granted');
    expect(readConsent(raw, now + (CONSENT_MAX_AGE_DAYS + 1) * DAY)).toBeNull();
  });

  it.each([
    null,
    '',
    'granted',
    '{bad json',
    JSON.stringify({ choice: 'maybe', at: now }),
    JSON.stringify({ choice: 'granted' }),
    JSON.stringify({ choice: 'granted', at: now + DAY }),
  ])('treats %s as no choice', (raw) => expect(readConsent(raw, now)).toBeNull());
});

describe('shouldLoadGa', () => {
  it('loads only with consent on a production host', () => {
    expect(shouldLoadGa('abhishekgoyal.me', 'granted')).toBe(true);
    expect(shouldLoadGa('www.abhishekgoyal.me', 'granted')).toBe(true);
    expect(shouldLoadGa('abhishekgoyal.me', 'denied')).toBe(false);
    expect(shouldLoadGa('abhishekgoyal.me', null)).toBe(false);
  });

  it.each([
    'localhost',
    'abhishekgoyal-me.abhigoel23.workers.dev',
    'pr-12-abhishekgoyal-me-staging.abhigoel23.workers.dev',
    'abhishekgoyal.me.evil.example',
  ])('never loads on %s', (host) => expect(shouldLoadGa(host, 'granted')).toBe(false));
});

describe('flagFromQuery', () => {
  it('reads the internal and debug flags', () => {
    expect(flagFromQuery('?internal=1', 'internal')).toBe(true);
    expect(flagFromQuery('?utm_source=x&internal=0', 'internal')).toBe(false);
    expect(flagFromQuery('?debug=1', 'debug')).toBe(true);
    expect(flagFromQuery('?debug=0', 'debug')).toBe(false);
  });

  it('leaves a flag alone when the query says nothing usable', () => {
    expect(flagFromQuery('?internal=yes', 'internal')).toBeNull();
    expect(flagFromQuery('?debug=1', 'internal')).toBeNull();
    expect(flagFromQuery('', 'debug')).toBeNull();
  });
});

describe('gaCookieNames', () => {
  it('finds only GA cookies', () => {
    expect(
      gaCookieNames('theme=dark; _ga=GA1.1.1.2; _ga_PHG39RRGSZ=GS1.1; _gat=1; x_ga=1'),
    ).toEqual(['_ga', '_ga_PHG39RRGSZ']);
    expect(gaCookieNames('')).toEqual([]);
  });
});
