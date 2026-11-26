# Growth

How the site is measured once a month, and where each number comes from.

**The site's job (decided 26 Nov 2026, #270):** it's the proof page that referrals, recruiters and founders
land on, not a lead source. By the October 2026 review it had brought 0 search clicks and 0 real leads,
with about 80 real visits a month. So posts are written only when they serve a specific conversation
([CONTENT.md](./CONTENT.md)), and the monthly review is a quick check of about 10 minutes: are search
impressions growing? Revisit this once search clicks or real leads start to appear.

## The three numbers

| Metric              | Definition                                                                                    | Source                                     |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Leads per month** | Leads saved in D1 that month (UTC), excluding Abhishek's own tests (`?debug=1`/`?internal=1`) | D1, via the Monthly tab                    |
| **Conversion %**    | Leads ÷ Cloudflare Web Analytics visits for the same month                                    | Monthly tab (you enter visits)             |
| **Indexed pages**   | Search Console → Indexing → Pages → Indexed, next to the sitemap's URL count                  | Search Console; sitemap count in the issue |

Why these sources:

- **D1, not GA4, counts leads.** GA4 only sees visitors who accept the consent bar, and `generate_lead`
  is consent-gated too. D1 has every lead.
- **Cloudflare Web Analytics, not GA4, counts visits.** It needs no consent, so it sees everyone. Leads
  and visits then cover the same people.
- **Visits before #246's deploy (12 Oct 2026) are inflated by CI.** Until then the beacon also counted the
  Playwright smoke run after every deploy and the nightly Lighthouse run, both against production (all
  US or Canada / direct / Chrome). The 2026-09 and 2026-10 Visits values are estimates: September's from
  non-US visits (~870), October's from India and the UK only (~80). November 2026 on is clean, so
  compare trends from there.
- **GA4 is optional.** With a handful of consented visitors a month it shows little. Its saved explorations
  ([ANALYTICS.md](./ANALYTICS.md#ga4-admin-settings)) are there for when traffic grows.
- With a handful of leads a month, a percentage swings wildly. Read the counts and the trend over
  several months before the percentage.

Months are UTC, so a lead at 02:00 IST on the 1st belongs to the previous month. That's 5.5 hours at
each end, which doesn't matter at this scale.

## The Monthly tab

The production Leads Sheet has a **Monthly** tab, one row per month. The repo is public, so these
numbers never go into GitHub.

The Worker's daily cron (`src/lib/server/monthly.ts`, 03:30 UTC) writes last month's row on the 1st.
If that fails, it alerts and tries again each day through the 7th, and it never writes a month twice.
It writes the header row itself the first time.

| Columns                               | Written by | What                                                                                   |
| ------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| A Month (UTC)                         | Worker     | `YYYY-MM`                                                                              |
| B–D Leads, Project leads, Role leads  | Worker     | Real leads by path                                                                     |
| E Test leads (excluded)               | Worker     | Your `?debug=1`/`?internal=1` leads, left out of B                                     |
| F–G Calls booked, Calls cancelled     | Worker     | Cal.com bookings created that month; of those, cancelled                               |
| H–I Newsletter sign-ups, Unsubscribes | Worker     | Confirmed / unsubscribed that month, tests excluded                                    |
| J Active subscribers (when recorded)  | Worker     | Confirmed, not unsubscribed, at the time of writing                                    |
| K Failed deliveries (when recorded)   | Worker     | Outbox steps in `failed` right now; should be 0                                        |
| L Recorded at (UTC)                   | Worker     | When the row was written                                                               |
| M Visits (CF Web Analytics)           | You        | Cloudflare → Analytics & Logs → Web Analytics → abhishekgoyal.me → last month → Visits |
| N Conversion %                        | You        | `=B<row>/M<row>`, formatted as a percentage                                            |
| O–P Indexed pages (GSC), Sitemap URLs | You        | Search Console; the sitemap count is in the review issue                               |
| Q–R Search clicks, Search impressions | You        | Search Console → Performance, last month                                               |
| S Posts published                     | You        | From the review issue                                                                  |
| T Notes                               | You        | What changed, top queries and pages, service-page search numbers, what to try next     |

The staging test Sheet has a Monthly tab too, because the staging Worker runs the same cron.
Only counts are recorded, never names or addresses, so the tab adds no personal data to the Sheet.

## The newsletter

Subscribers were promised "occasional notes on what I'm building", so a note goes out only when there's
something new, and at most once a month: new posts since the last note, a few lines on what you're
building, and the checklist link. Drafted with `pnpm digest` into `newsletter/<date>.html`, reviewed in a
PR, and sent by the Send newsletter workflow: a test to staging first, then production
([RUNBOOK → Sending a note](./RUNBOOK.md#newsletter-subscribers)). Its links carry
`utm_source=newsletter&utm_medium=email&utm_campaign=digest-<date>`, so GA4 and the Sheets attribute
visits and leads to the note that brought them.

## Experiments

**Paused.** With under a hundred real visits a month, a CTA change can't show a difference in any
reasonable window. Restart once visits reach a few hundred a month: one change at a time, opened from the
Experiment template (`.github/ISSUE_TEMPLATE/experiment.yml`) with its metric, windows and decision rule
written before the change ships, measured in CTA clicks per 100 page views from GA4.

## The monthly review

At 10:00 IST on the 1st, `.github/workflows/monthly-review.yml` opens **Monthly review YYYY-MM**
(label `routine`, no milestone). It holds the quick check (about 10 minutes), the posts published that
month and the live sitemap's URL count, but no lead or subscriber numbers:

1. **The Monthly row:** it's there, every real lead was answered, and Failed deliveries is 0.
2. **Fill in** Visits and Conversion % (columns M–N), Search clicks and impressions (Q–R), Indexed pages and
   Sitemap URLs (O–P), and Posts published (S).
3. **Read the trend** of search impressions over the last three rows. If they grow but clicks don't, check
   the titles and descriptions of the pages getting them. Per-page and per-query detail
   ([SEO.md](./SEO.md)) is optional, for when that happens.
4. **One line in Notes**, then close the issue.

To open one by hand (for example, for a missed month): Actions → Monthly review → Run workflow, with
`month` set to `YYYY-MM`. If that month's issue already exists, the run doesn't open another.

The checklist's text lives in `src/lib/monthlyReview.ts`. Change it there, not in old issues.
