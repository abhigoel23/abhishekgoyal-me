// Pure consent helpers for the consent bar (src/components/ConsentBar.astro), kept out of the DOM so
// they can be unit tested.
import { CONSENT_MAX_AGE_DAYS, GA_HOSTS } from '../data/analytics';

export type ConsentChoice = 'granted' | 'denied';

/** localStorage keys: the visitor's choice, and the "this is me" flag set by `?internal=1`. */
export const CONSENT_KEY = 'consent';
export const INTERNAL_KEY = 'ga_internal';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The stored choice, or null when there is none, it is unreadable, or it has expired (ask again). */
export function readConsent(raw: string | null, now: number): ConsentChoice | null {
  if (!raw) return null;
  try {
    const { choice, at } = JSON.parse(raw) as { choice?: unknown; at?: unknown };
    if (choice !== 'granted' && choice !== 'denied') return null;
    if (typeof at !== 'number' || at > now || now - at > CONSENT_MAX_AGE_DAYS * DAY_MS) return null;
    return choice;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice, now: number): string {
  return JSON.stringify({ choice, at: now });
}

/** gtag loads only with consent, and only on the production hosts (never previews or localhost). */
export function shouldLoadGa(hostname: string, choice: ConsentChoice | null): boolean {
  return choice === 'granted' && (GA_HOSTS as readonly string[]).includes(hostname);
}

/** `?internal=1` marks this browser as internal traffic, `?internal=0` unmarks it, otherwise null. */
export function internalFromQuery(search: string): boolean | null {
  const value = new URLSearchParams(search).get('internal');
  return value === '1' ? true : value === '0' ? false : null;
}

/** Names of the GA cookies (`_ga`, `_ga_<stream>`) present in a cookie string. */
export function gaCookieNames(cookie: string): string[] {
  return cookie
    .split(';')
    .map((part) => part.split('=')[0]!.trim())
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));
}
