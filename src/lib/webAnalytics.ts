// When the Cloudflare beacon (src/components/WebAnalytics.astro) loads, kept out of the DOM so it can be
// unit tested.
import { ANALYTICS_HOSTS } from '../data/analytics';

/** The parts of `navigator` that give an automated browser away. */
export type BrowserInfo = { webdriver?: boolean; userAgent: string };

/**
 * Playwright and headless Chrome set `navigator.webdriver`; Lighthouse's user agent says
 * `Chrome-Lighthouse`. CI runs both against production after every deploy and nightly, and before
 * this check they were most of Cloudflare's visits.
 */
export function isAutomatedBrowser({ webdriver, userAgent }: BrowserInfo): boolean {
  return webdriver === true || userAgent.includes('Chrome-Lighthouse');
}

/** The beacon loads on the live site only, and never for automated browsers. */
export function shouldLoadBeacon(hostname: string, browser: BrowserInfo): boolean {
  return (ANALYTICS_HOSTS as readonly string[]).includes(hostname) && !isAutomatedBrowser(browser);
}
