# Analytics

What is tracked, where it lives, and how to check it's working.

## What is measured, and where

| Tool                                | Measures                                                                             | Consent           | Sees                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------- |
| Google Analytics 4 (`G-PHG39RRGSZ`) | Page views, CTA clicks, form steps, leads, sign-ups, case study reads, PDF downloads | Only after Accept | Visitors who accept and don't block Google                    |
| Cloudflare Web Analytics            | Page counts                                                                          | None (cookieless) | Everyone, including visitors who decline or run an ad blocker |

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

| Event             | Fires from                                            | Parameters                                                                                                                                         | Sent when                                                                                                  |
| ----------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `page_view`       | Browser (GA4 automatic)                               | GA4's default set                                                                                                                                  | Every page load, once `gtag.js` has loaded                                                                 |
| `form_step`       | Browser (`LeadForm.tsx`)                              | `lead_path` (`project`, `role`, `following`)                                                                                                       | A path is chosen on /contact                                                                               |
| `form_start`      | Browser (`LeadForm.tsx`, `NewsletterForm.tsx`)        | `lead_path` (as above, or `checklist` on /checklist)                                                                                               | The first time the visitor types in the form, once per mount                                               |
| `cta_click`       | Browser (`Analytics.astro`)                           | `cta`                                                                                                                                              | Any click on an element with `data-cta="…"`, except `book_call`                                            |
| `book_call_click` | Browser (`Analytics.astro`)                           | `cta` (always `"book_call"`)                                                                                                                       | Click on the Book a call CTA                                                                               |
| `generate_lead`   | Worker (`src/lib/server/ga.ts`, Measurement Protocol) | `lead_id`, `lead_path`, `budget_band`, `lead_source`, `engagement_time_msec`, plus `session_id` / `debug_mode` / `traffic_type` when applicable    | The queue consumer, once the lead is saved (see below)                                                     |
| `sign_up`         | Worker (`src/lib/server/ga.ts`, Measurement Protocol) | `method` (the sign-up form: `checklist` or `lead_form`), `engagement_time_msec`, plus `session_id` / `debug_mode` / `traffic_type` when applicable | The queue consumer, once the address is confirmed (see below)                                              |
| `case_study_read` | Browser (`CaseStudyRead.astro`)                       | `case_study` (the slug)                                                                                                                            | On `/work/[slug]`, once the end of the text is in view and the page has been open 20 s; once per page view |
| `file_download`   | Browser (GA4 Enhanced Measurement)                    | GA4's default set (`file_name`, `file_extension`, `link_url`, …)                                                                                   | A click on a link to a `.pdf`, e.g. the resume on `/resume` and `/hire`                                    |

The CTA ids currently in the markup, all sent as `cta_click` except where noted:

| `data-cta`                                             | Where                           |
| ------------------------------------------------------ | ------------------------------- |
| `header_start_project`                                 | `src/components/Header.astro`   |
| `hero_start_project`                                   | `src/components/Hero.astro`     |
| `hero_hire`                                            | `src/components/Hero.astro`     |
| `hire_request_interview`                               | `src/pages/hire.astro`          |
| `hire_request_interview_footer`                        | `src/pages/hire.astro`          |
| `footer_checklist`                                     | `src/components/Footer.astro`   |
| `book_call` (fires `book_call_click`, not `cta_click`) | `src/components/BookCall.astro` |

`track()` (`src/lib/track.ts`) is a no-op until `gtag` exists on `window`, which only happens after
Accept — so all the browser-side events above are consent-gated automatically, with no separate check
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

## How `sign_up` works

`sign_up` is the newsletter's key event, sent like `generate_lead`: by the queue consumer's `ga` step
(`sendSignUp` in `src/lib/server/ga.ts`), and only if the sign-up form carried a `ga_client_id`, i.e.
the visitor had accepted analytics. It fires when the address is **confirmed** (the double opt-in
button, #109), not when the form is submitted, so an unconfirmed or mistyped address never counts.
`method` is the form it came from (`checklist` on /checklist, `lead_form` for "Just following along"
on /contact).

Because confirming happens later, usually from an email app and often on another device, `sign_up`
usually **doesn't join the original visit**: it carries the sign-up visit's `session_id`, but GA only
attributes it to that session while the session is still open (30 minutes of inactivity by default).
Expect many sign-ups to show as `(direct)` / `(not set)` for source. For attribution, use the
Subscribers Sheet, which stores first-touch `source_page` and UTM params from the sign-up visit.

## PDF downloads

`file_download` comes from GA4's Enhanced Measurement (file downloads on), which records clicks on links
to `.pdf` and other file types. Nothing is added in code, so nothing is counted twice. It covers
`/resume.pdf` (linked from `/resume` and `/hire`).

The checklist PDF is only linked from the delivery email. That click happens in the reader's email
app, where GA doesn't run, and the PDF itself can't run a script, so **checklist downloads can't be
tracked**. `sign_up` (a confirmed address, which is what triggers that email) is the proxy.

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

- **DebugView** (GA4 → Admin → DebugView): **only while the developer-traffic filter is _Inactive_.**
  Both data filters are _Active_ (see below), and an active developer-traffic filter drops every
  `debug_mode` event before DebugView sees it, so DebugView stays empty. GA won't move an active filter
  back to _Testing_, only to _Inactive_: switch it off for the test, and back to _Active_ straight after.
  Then visit the site with `?debug=1`, accept the consent bar, and step through the form. `form_start`, `form_step` and any `cta_click` / `book_call_click` should appear
  within seconds. `generate_lead` appears only after the queue consumer has run for that lead (not
  instantly on submit). `sign_up` appears once the address is confirmed and the consumer has run;
  the `?debug=1` flag is saved with the sign-up, so confirming from any device still routes it to
  DebugView.
  `case_study_read` appears after 20 s at the end of a case study.
- **Realtime** (GA4 → Reports → Realtime): confirms events without needing the debug flag. With the
  internal-traffic filter _Active_, visits tagged `?internal=1` don't show here either; test from a
  browser without the flag (`?internal=0`) to see them.
- **Without touching GA** (server-side events): a debug `generate_lead` or `sign_up` is also sent to
  GA's validation endpoint, and the Worker logs the answer as `GA debug event`. In Cloudflare →
  Workers & Pages → `abhishekgoyal-me` → Observability, search for it. No `validationMessages` field
  (the logs drop empty lists) means GA accepted the event as valid.
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

For a cross-posted blog post, `utm_campaign` is the post's slug. `pnpm share <slug>` builds these links
from `src/data/share.ts` (`utm_source=linkedin`, `utm_medium=social`). Links added by hand on dev.to, such
as the profile's website URL, use `utm_source=devto&utm_medium=social` (`utm_campaign=profile` there). The canonical URL
itself never carries UTM params.

`src/components/Attribution.astro` captures `source_page`, the three UTM params and a cross-site
`referrer` into `sessionStorage` on first landing, so a later visit to `/contact` (without the query
string still attached) carries the same first-touch attribution. Both forms read that
(`submissionContext()` in `src/components/react/formParts.tsx`) and send it with the lead or sign-up, so
every row in the Leads and Subscribers Sheets carries first-touch attribution alongside the submission — not just whatever GA recorded for the session.

## GA4 admin settings

Some of the analytics configuration lives only in the GA4 web interface, not in this repository, so
there is nothing here to diff or restore from a backup. As configured:

- `generate_lead` marked as a key event (GA4's term for a conversion). `sign_up` is marked too once
  the first real sign-up has arrived (Admin → Data display → Events → Mark as key event): GA only
  offers it for an event it has already processed, and test sign-ups are filtered out.
- Enhanced Measurement with **File downloads** on (the source of `file_download`).
- An internal-traffic data filter matching the `traffic_type` parameter, so my own visits (tagged via
  `?internal=1`) are excluded from reports rather than deleted.
- The developer-traffic filter (_Active_), excluding events that carry `debug_mode` — set by `?debug=1`
  here, and by tools such as Tag Assistant — so test traffic stays out of the reports. While it is
  active, DebugView shows nothing (see "Checking that it works").
- Google signals off, matching `allow_google_signals: false` in the client-side config.
- Data retention set to 14 months, the longest GA4 offers.
- Search Console linked, for organic query data in GA4's reports.
- Five event-scoped custom dimensions (Admin → Data display → Custom definitions), registered
  2026-09-24. GA4 only fills a custom dimension from the day it's registered, so these reports can't
  break down earlier data:

  | Dimension      | Event parameter | Sent with                                  |
  | -------------- | --------------- | ------------------------------------------ |
  | Lead path      | `lead_path`     | `form_step`, `form_start`, `generate_lead` |
  | CTA            | `cta`           | `cta_click`, `book_call_click`             |
  | Case study     | `case_study`    | `case_study_read`                          |
  | Sign-up method | `method`        | `sign_up`                                  |
  | Budget band    | `budget_band`   | `generate_lead`                            |

  Left out on purpose: `lead_id` and `session_id` (one value per lead, so useless as a breakdown) and
  `lead_source` (GA's own session source dimensions cover it).

- Saved explorations (Explore), used in the monthly review ([GROWTH.md](./GROWTH.md)). Set each one's
  date range to the month under review; the range is saved with the exploration.

  | Exploration                     | Type      | Setup                                                                                                                                                                         |
  | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Lead funnel**                 | Funnel    | Closed. Tab 1: `page_view` → `form_start` → `generate_lead`. Tab "Sign-up funnel": `page_view` → `form_start` where `lead_path` = `checklist` → `sign_up`                     |
  | **Landing pages by conversion** | Free form | Rows: Landing page + query string. Values: Sessions, Engaged sessions, Key events, Session key event rate. A post shows as `/writing/<slug>`                                  |
  | **Source / medium**             | Free form | Rows: Session source / medium, then Session campaign; same values. Tab "CTA clicks": rows CTA, value Event count, filtered to Event name = `cta_click` (data from 2026-09-24) |

  These only see visitors who accept the consent bar; totals come from D1 and Cloudflare (GROWTH.md).
  "Key events" is `generate_lead` alone until `sign_up` is marked, then both.

Nothing checks this list against GA, so it drifts silently if a filter or report is renamed there.
Worth a glance whenever the analytics setup changes.
