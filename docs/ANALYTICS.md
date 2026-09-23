# Analytics

What is tracked, where it lives, and how to check it's working.

## What is measured, and where

| Tool                                | Measures                                  | Consent           | Sees                                                          |
| ----------------------------------- | ----------------------------------------- | ----------------- | ------------------------------------------------------------- |
| Google Analytics 4 (`G-PHG39RRGSZ`) | Page views, CTA clicks, form steps, leads | Only after Accept | Visitors who accept and don't block Google                    |
| Cloudflare Web Analytics            | Page counts                               | None (cookieless) | Everyone, including visitors who decline or run an ad blocker |

Both exist because GA4 only sees visitors who accept the consent bar and don't block Google, which on a
site with a lead form and no other product analytics isn't everyone. Cloudflare's beacon is the backstop:
it can't identify anyone or set cookies, so it needs no consent, and it is the only number that reflects
total traffic.

Cloudflare's own dashboard toggle for this site is set to "Enable with JS Snippet installation", not
automatic injection: automatic injection only rewrites HTML that Cloudflare serves directly, and this
site's HTML is served by the Worker (`src/worker.ts`), which it never touches. So the beacon script is
installed by hand in `src/components/WebAnalytics.astro`, with the token from `src/data/analytics.ts`
(`CF_BEACON_TOKEN`, public — it ships in the page source).

## Consent model

The consent bar (`src/components/ConsentBar.astro`) implements Basic Consent Mode v2. Before the visitor
chooses, no request to Google happens at all — `gtag.js` isn't even loaded.

On **Accept**:

1. `gtag('consent', 'default', …)` denies all four types (`analytics_storage`, `ad_storage`,
   `ad_user_data`, `ad_personalization`).
2. `gtag('consent', 'update', { analytics_storage: 'granted' })` grants analytics only. The three ad
   types stay denied — this site never asks for ad consent.
3. `gtag('config', GA_MEASUREMENT_ID, …)` sets `allow_google_signals: false`,
   `allow_ad_personalization_signals: false`, and `cookie_expires` to
   `CONSENT_MAX_AGE_DAYS * 24 * 60 * 60` (182 days).
4. The chosen `gtag.js` script tag is appended to `<head>`.

The choice itself is stored in `localStorage` (`consent` key, `src/lib/consent.ts`) as
`{ choice, at }`, and expires after the same 182 days (`CONSENT_MAX_AGE_DAYS`), so an old consent can't
outlive the GA cookies it granted. After 182 days the bar asks again.

On **Decline**, or when consent is withdrawn after previously accepting: `gtag('consent', 'update', {
analytics_storage: 'denied' })` if `gtag` had loaded, then `removeGaCookies()` deletes every `_ga` and
`_ga_<stream>` cookie found in `document.cookie`.

The footer's "Cookie settings" link (`[data-consent-open]`) reopens the bar so consent can be withdrawn
as easily as it was given — Accept and Decline are equal-weight buttons, no dark pattern.

`gtag.js` loads only on `abhishekgoyal.me` and `www.abhishekgoyal.me` (`ANALYTICS_HOSTS` in
`src/data/analytics.ts`) — never on previews, staging, or `localhost`.

## Event table

| Event             | Fires from                                            | Parameters                                                                                                                                      | Sent when                                                       |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `page_view`       | Browser (GA4 automatic)                               | GA4's default set                                                                                                                               | Every page load, once `gtag.js` has loaded                      |
| `form_step`       | Browser (`LeadForm.tsx`)                              | `lead_path`                                                                                                                                     | A path is chosen ("A project…" or "A full-time role")           |
| `form_start`      | Browser (`LeadForm.tsx`)                              | `lead_path`                                                                                                                                     | The first time the visitor types in the form, once per mount    |
| `cta_click`       | Browser (`Analytics.astro`)                           | `cta`                                                                                                                                           | Any click on an element with `data-cta="…"`, except `book_call` |
| `book_call_click` | Browser (`Analytics.astro`)                           | `cta` (always `"book_call"`)                                                                                                                    | Click on the Book a call CTA                                    |
| `generate_lead`   | Worker (`src/lib/server/ga.ts`, Measurement Protocol) | `lead_id`, `lead_path`, `budget_band`, `lead_source`, `engagement_time_msec`, plus `session_id` / `debug_mode` / `traffic_type` when applicable | The queue consumer, once the lead is saved (see below)          |

The CTA ids currently in the markup, all sent as `cta_click` except where noted:

| `data-cta`                                             | Where                           |
| ------------------------------------------------------ | ------------------------------- |
| `header_start_project`                                 | `src/components/Header.astro`   |
| `hero_start_project`                                   | `src/components/Hero.astro`     |
| `hero_hire`                                            | `src/components/Hero.astro`     |
| `hire_request_interview`                               | `src/pages/hire.astro`          |
| `hire_request_interview_footer`                        | `src/pages/hire.astro`          |
| `book_call` (fires `book_call_click`, not `cta_click`) | `src/components/BookCall.astro` |

`track()` (`src/lib/track.ts`) is a no-op until `gtag` exists on `window`, which only happens after
Accept — so all five browser-side events above are consent-gated automatically, with no separate check
in each caller. Note the order in the funnel: `form_step` fires when the path is picked, before
`form_start`, which waits for the first keystroke.

## How `generate_lead` works

`generate_lead` is never sent from the browser. It is sent by the queue consumer's `ga` outbox step
(`src/lib/server/ga.ts`, `sendGenerateLead`), after the lead row is already saved in D1 — so a failed
submit can never count as a conversion, and an ad blocker on the visitor's side can't drop it.

It is skipped entirely (`sendGenerateLead` returns `'skipped'`) unless the lead carries a `ga_client_id`
— the GA4 client id read from the `_ga` cookie by `gaClientId()` in `src/lib/track.ts`. That cookie only
exists if the visitor consented, so `generate_lead` is implicitly consent-gated too, even though it's a
server call.

No PII is sent — only `lead_id` (a random UUID, used to join the GA conversion back to its row in the
Leads Sheet), `lead_path`, `budget_band`, and `lead_source`. `session_id` (from the `_ga_<stream>`
cookie, via `gaSessionId()`) joins the conversion to the visitor's GA session, so it attributes to the
right source instead of landing as "(not set)". `debug_mode: 1` is added when the lead carried
`ga_debug === '1'`, routing the event to DebugView; `traffic_type: 'internal'` is added when the lead
carried `ga_internal === '1'`, which is what GA's internal-traffic filter matches on.

The outbox (`src/lib/server/outbox.ts`) only runs a step while its `outbox_status` row is `pending` or
`failed`, and marks it `done` once the handler succeeds — so retries (queue redelivery, the daily cron)
never repeat a step that already succeeded, which is how `generate_lead` ends up sent exactly once per
lead.

Outside production (`config.environment !== 'production'`), the event goes to
`https://www.google-analytics.com/debug/mp/collect` instead of the live collect endpoint: GA validates
the payload and returns any `validationMessages`, but records nothing, so staging and local runs never
pollute the real reports.

## The `?internal=1` and `?debug=1` flags

Appending `?internal=1` or `?debug=1` to any URL on the live site sets a `localStorage` flag in that
browser (`ga_internal` / `ga_debug`, `src/lib/consent.ts`):

- `?internal=1` — marks this browser as mine. `gtag('config', …)` then sends `traffic_type: 'internal'`
  on every subsequent GA4 hit, and the lead form carries `ga_internal: '1'`, so the server-side
  `generate_lead` carries it too. Used with GA's internal-traffic data filter to keep my own visits out
  of the reports.
- `?debug=1` — marks this browser for DebugView. `gtag('config', …)` then sends `debug_mode: true` on
  browser events, and the form's `ga_debug: '1'` makes the server-side `generate_lead` carry
  `debug_mode: 1` too. Used to watch events arrive live while testing.

Both flags persist in that browser until the opposite value is passed (`?internal=0` / `?debug=0`);
they don't expire on their own the way the consent choice does.

## Checking that it works

- **DebugView** (GA4 → Admin → DebugView): visit the site with `?debug=1`, accept the consent bar, and
  step through the form. `form_start`, `form_step` and any `cta_click` / `book_call_click` should appear
  within seconds. `generate_lead` appears only after the queue consumer has run for that lead (not
  instantly on submit).
- **Realtime** (GA4 → Reports → Realtime): confirms events without needing the debug flag. A data
  filter in _Testing_ state excludes nothing, so a visit tagged `?internal=1` still shows here until
  the internal-traffic filter is switched to _Active_.
- **Declined consent**: with the bar declined (or before any choice is made), no request to
  `googletagmanager.com` or `google-analytics.com` should appear in the browser's network tab, and no
  `_ga*` cookies should be set. This is the expected, correct behaviour, not a bug.
- **Cloudflare's counts**: Cloudflare dashboard → the zone → Analytics & Logs → Web Analytics. These
  numbers are independent of consent and should be the highest of the three (GA4 users, GA4 sessions,
  Cloudflare visits) since it's the only one that counts everyone.

## UTM convention

Campaign links use the standard three params: `utm_source`, `utm_medium`, `utm_campaign`. Example, for a
LinkedIn post announcing the site:

```
https://abhishekgoyal.me/?utm_source=linkedin&utm_medium=social&utm_campaign=launch
```

`src/components/Attribution.astro` captures `source_page`, the three UTM params and a cross-site
`referrer` into `sessionStorage` on first landing, so a later visit to `/contact` (without the query
string still attached) carries the same first-touch attribution. `src/components/react/LeadForm.tsx`
reads that and sends it with the lead, so every row in the Leads Sheet carries first-touch attribution
alongside the submission — not just whatever GA recorded for the session.

## GA4 admin settings

Some of the analytics configuration lives only in the GA4 web interface, not in this repository, so
there is nothing here to diff or restore from a backup. As configured:

- `generate_lead` marked as a key event (GA4's term for a conversion).
- An internal-traffic data filter matching the `traffic_type` parameter, so my own visits (tagged via
  `?internal=1`) are excluded from reports rather than deleted.
- The developer-traffic filter, excluding events that carry `debug_mode` — set by `?debug=1` here, and
  by tools such as Tag Assistant — so test traffic stays in DebugView and out of the reports.
- Google signals off, matching `allow_google_signals: false` in the client-side config.
- Data retention set to 14 months, the longest GA4 offers.
- Search Console linked, for organic query data in GA4's reports.
- Saved Explore reports: a funnel `page_view → form_start → generate_lead`; landing pages by
  conversion; and a source/medium breakdown.

Nothing checks this list against GA, so it drifts silently if a filter or report is renamed there.
Worth a glance whenever the analytics setup changes.
