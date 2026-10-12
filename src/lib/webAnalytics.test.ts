import { describe, expect, it } from 'vitest';
import { isAutomatedBrowser, shouldLoadBeacon } from './webAnalytics';

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const LIGHTHOUSE =
  'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse';
const person = { webdriver: false, userAgent: CHROME };

describe('isAutomatedBrowser', () => {
  it('flags webdriver and Lighthouse', () => {
    expect(isAutomatedBrowser({ webdriver: true, userAgent: CHROME })).toBe(true);
    expect(isAutomatedBrowser({ webdriver: false, userAgent: LIGHTHOUSE })).toBe(true);
  });

  it('passes a normal browser, with or without the webdriver property', () => {
    expect(isAutomatedBrowser(person)).toBe(false);
    expect(isAutomatedBrowser({ userAgent: CHROME })).toBe(false);
  });
});

describe('shouldLoadBeacon', () => {
  it('loads for people on the live site', () => {
    expect(shouldLoadBeacon('abhishekgoyal.me', person)).toBe(true);
    expect(shouldLoadBeacon('www.abhishekgoyal.me', person)).toBe(true);
  });

  it('never loads for automated browsers, even on the live site', () => {
    expect(shouldLoadBeacon('abhishekgoyal.me', { webdriver: true, userAgent: CHROME })).toBe(
      false,
    );
    expect(shouldLoadBeacon('abhishekgoyal.me', { userAgent: LIGHTHOUSE })).toBe(false);
  });

  it.each(['localhost', 'abhishekgoyal-me.workers.dev', 'staging.abhishekgoyal.me'])(
    'never loads on %s',
    (host) => expect(shouldLoadBeacon(host, person)).toBe(false),
  );
});
