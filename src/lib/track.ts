// Client-side analytics. A no-op until GA4 loads, which only happens after the visitor accepts in the
// consent bar (src/components/ConsentBar.astro), and only on the production hosts. Parameters are coarse labels (path, CTA name, budget band), never PII.
// generate_lead is NOT sent from here: the server sends it once the lead is saved (src/lib/server/ga.ts),
// so ad blockers can't drop it and a failed submit can't count as a conversion.

export type TrackEvent =
  | { name: 'form_start'; params: { lead_path: string } }
  | { name: 'form_step'; params: { lead_path: string } }
  | { name: 'cta_click'; params: { cta: string } }
  | { name: 'book_call_click'; params: { cta: string } }
  | { name: 'case_study_read'; params: { case_study: string } };

type Gtag = (command: 'event', name: string, params: Record<string, string>) => void;

export function track(event: TrackEvent) {
  const gtag = (globalThis as { gtag?: Gtag }).gtag;
  if (typeof gtag !== 'function') return;
  try {
    gtag('event', event.name, event.params);
  } catch {
    // Analytics must never break the page.
  }
}

/**
 * The GA4 client id ("123.456") from the `_ga` cookie ("GA1.1.123.456"), or undefined when GA hasn't
 * run (no consent, blocked). Sent with the lead so the server-side generate_lead joins the session.
 */
export function gaClientId(cookie = typeof document === 'undefined' ? '' : document.cookie) {
  const match = /(?:^|;\s*)_ga=GA\d\.\d\.(\d{1,20}\.\d{1,20})(?:;|$)/.exec(cookie);
  return match?.[1];
}

/**
 * The GA4 session id from the `_ga_<stream>` cookie, or undefined when GA hasn't run. Sent with the
 * lead so the server-side generate_lead joins the visitor's session, and its source, instead of
 * landing as "(not set)". Two cookie formats are in the wild:
 *   GS1.1.1790171878.1.0.1790171878.0.0.0          (dot-separated)
 *   GS2.1.s1790172090$o1$g0$t1790172090$j60$l0$h0  (current: `s` prefix, $-separated)
 */
export function gaSessionId(
  measurementId: string,
  cookie = typeof document === 'undefined' ? '' : document.cookie,
) {
  const stream = measurementId.replace(/^G-/, '');
  if (!/^[A-Z0-9]+$/.test(stream)) return undefined;
  const match = new RegExp(`(?:^|;\\s*)_ga_${stream}=GS\\d\\.\\d\\.s?(\\d{1,20})(?:[.$]|;|$)`).exec(
    cookie,
  );
  return match?.[1];
}
