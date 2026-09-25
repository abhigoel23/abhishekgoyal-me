// The monthly review issue's title and checklist (scripts/monthly-review.mjs, opened on the 1st by
// .github/workflows/monthly-review.yml). The repo is public, so the issue carries no lead or subscriber
// numbers: those are in the private Leads Sheet's Monthly tab (src/lib/server/monthly.ts).
// No imports: Node loads this directly.

export type PublishedPost = { title: string; url: string };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH.test(value);
}

/** The month before `now` (UTC), as "YYYY-MM". */
export function lastMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}

export function monthName(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, m! - 1, 1)).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function reviewTitle(month: string): string {
  return `Monthly review ${month}`;
}

export function reviewBody(
  month: string,
  posts: PublishedPost[],
  repo: string,
  sitemapUrls?: number,
): string {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year!, m!, 0)).toISOString().slice(0, 10);
  const skipped = `https://github.com/${repo}/issues?q=${encodeURIComponent(
    `is:issue label:routine "Post:" in:title reason:"not planned" closed:${month}-01..${lastDay}`,
  )}`;
  const postLines = posts.length
    ? posts.map((p) => `- [${p.title}](${p.url})`)
    : ['- None this month.'];
  return [
    `Review of **${monthName(month)}** (UTC). Definitions and where each number comes from: [docs/GROWTH.md](https://github.com/${repo}/blob/main/docs/GROWTH.md).`,
    '',
    '> The numbers go in the private Leads Sheet → **Monthly** tab, never in this issue: the repo is public.',
    '',
    `**Posts published** (target: one every 2 weeks): ${posts.length}`,
    ...postLines,
    `- Skipped posts: [Post issues closed as not planned](${skipped})`,
    '',
    `**1. Monthly tab**, row \`${month}\``,
    '- [ ] The row is there. The Worker writes it on the 1st, 09:00 IST; if it\'s missing, see RUNBOOK → "The Monthly row is missing"',
    '- [ ] **Visits**: Cloudflare → Analytics & Logs → Web Analytics → abhishekgoyal.me → last month → Visits',
    '- [ ] **Conversion %**: `=Leads/Visits` for the row (e.g. `=B3/M3`), formatted as a percentage',
    `- [ ] **Posts published**: ${posts.length}${sitemapUrls === undefined ? '' : ` · **Sitemap URLs**: ${sitemapUrls}`}`,
    '',
    '**2. Search Console** (last month)',
    '- [ ] Indexing → Pages: **Indexed pages**, and anything new under "Why pages aren\'t indexed"',
    '- [ ] Performance: **Search clicks** and **impressions**; top 3 queries and pages in Notes',
    '',
    '**3. GA4** (only visitors who accept the consent bar)',
    '- [ ] Explore, with the date range set to this month: **Lead funnel** (both tabs), **Landing pages by conversion**, **Source / medium** (and its CTA clicks tab)',
    "- [ ] If `sign_up` appears in Admin → Events and isn't a key event yet, mark it as one (then delete this line from `src/lib/monthlyReview.ts`)",
    '',
    '**4. Leads and Subscribers Sheets**',
    '- [ ] Every lead this month was answered; first-touch source noted; spam deleted',
    '- [ ] Failed deliveries in the Monthly row is 0; if not, RUNBOOK',
    '',
    '**5. Newsletter**',
    "- [ ] Something new since the last note, and none sent this month? Draft it with `pnpm digest <last note's date>`, then send it test → production (RUNBOOK → Sending a note)",
    '',
    '**6. Decide**',
    '- [ ] One line in Notes: what changed, and what to try next (experiments: docs/GROWTH.md)',
    '- [ ] Close this issue',
  ].join('\n');
}
