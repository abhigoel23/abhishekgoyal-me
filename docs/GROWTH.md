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
  funnel drops (the saved Explore reports, #115).
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

## The monthly review

At 10:00 IST on the 1st, `.github/workflows/monthly-review.yml` opens **Monthly review YYYY-MM**
(label `routine`, no milestone). It holds the checklist, posts published that month, a link to skipped
Post issues, and the live sitemap's URL count, but no lead or subscriber numbers. Work through it, fill in
the Monthly row, then close the issue.

To open one by hand (for example, for a missed month): Actions → Monthly review → Run workflow, with
`month` set to `YYYY-MM`. If that month's issue already exists, the run doesn't open another.

The checklist's text lives in `src/lib/monthlyReview.ts`. Change it there, not in old issues.
