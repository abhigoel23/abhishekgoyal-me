# Growth

How the site is measured once a month, and where each number comes from. The routine: a post every 2
weeks ([CONTENT.md](./CONTENT.md), [TOPICS.md](./TOPICS.md)), cross-posted to LinkedIn and dev.to, and
one review a month.

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
- **GA4 is for the shape, not the totals:** which sources and landing pages lead to leads, and where the
  funnel drops (the saved explorations listed in [ANALYTICS.md](./ANALYTICS.md#ga4-admin-settings)).
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
| T Notes                               | You        | What changed, top queries and pages, what to try next                                  |

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

CTA experiments run **one change at a time**, compared with the weeks before it. With a few hundred visits
a month, a real A/B split would take months to mean anything and would add a cookie; a sequential test
with its rule written in advance is honest about what it can show.

1. **Start from the monthly review.** The hypothesis comes from something the numbers showed. The first
   experiment can start once October gives a full month of baseline, so in November at the earliest.
2. **Open an issue from the Experiment template** (`.github/ISSUE_TEMPLATE/experiment.yml`) and fill in
   everything above Result **before** the change is merged: hypothesis, the one change, the metric, both
   windows and the decision rule, including the minimum number of clicks below which the result is
   inconclusive.
3. **Measure clicks, not leads.** Leads are too few to show a difference in weeks. The metric is usually a
   CTA's clicks per 100 views of its page, from GA4 → Explore → Source / medium → **CTA clicks** (the
   `cta` dimension exists from 2026-09-24). Both numbers come from consented visitors only, so the ratio is
   consistent; record leads from the Monthly tab alongside anyway.
4. **Keep the `data-cta` id** when only the wording or look changes (the copy lives in `src/data/`), so
   the before and after windows count the same thing. A new element gets a new id, added to the CTA table
   in [ANALYTICS.md](./ANALYTICS.md#event-table).
5. **Ship the change in its own PR** that refers to the issue, and note the day it went live. Change
   nothing else about that CTA or page during the window, and write down what else happened: a post, a
   newsletter note, a traffic spike. Those can explain a difference as well as the change can.
6. **Record the result**, including "inconclusive" and "no clear difference", apply the decision (keep, or
   revert in a PR), and close the issue. Then the next experiment can start.

## The monthly review

At 10:00 IST on the 1st, `.github/workflows/monthly-review.yml` opens **Monthly review YYYY-MM**
(label `routine`, no milestone). It holds the checklist, posts published that month, a link to skipped
Post issues, and the live sitemap's URL count, but no lead or subscriber numbers. Work through it, fill in
the Monthly row, then close the issue.

To open one by hand (for example, for a missed month): Actions → Monthly review → Run workflow, with
`month` set to `YYYY-MM`. If that month's issue already exists, the run doesn't open another.

The checklist's text lives in `src/lib/monthlyReview.ts`. Change it there, not in old issues.
