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
  const postLines = posts.length
    ? posts.map((p) => `- [${p.title}](${p.url})`)
    : ['- None this month.'];
  return [
    `Review of **${monthName(month)}** (UTC), about 10 minutes. What each number means: [docs/GROWTH.md](https://github.com/${repo}/blob/main/docs/GROWTH.md).`,
    '',
    '> The numbers go in the private Leads Sheet → **Monthly** tab, never in this issue: the repo is public.',
    '',
    `**Posts published**: ${posts.length}`,
    ...postLines,
    '',
    `**1. Monthly tab**, row \`${month}\``,
    '- [ ] The row is there (the Worker writes it on the 1st, 09:00 IST; if it\'s missing, see RUNBOOK → "The Monthly row is missing"). Every real lead was answered, and Failed deliveries is 0 (if not, RUNBOOK)',
    '- [ ] **Visits**: Cloudflare → Analytics & Logs → Web Analytics → abhishekgoyal.me → last month → Visits. **Conversion %**: `=Leads/Visits` for the row (e.g. `=B3/M3`), formatted as a percentage',
    '- [ ] Search Console, last month: **Search clicks** and **impressions** (Performance), **Indexed pages** (Indexing → Pages)',
    `- [ ] **Posts published**: ${posts.length}${sitemapUrls === undefined ? '' : ` · **Sitemap URLs**: ${sitemapUrls}`}`,
    '',
    '**2. The trend** (search impressions over the last three rows)',
    '- [ ] Impressions growing but no clicks? Check the titles and descriptions of the pages getting them (Search Console → Performance → Pages)',
    '- [ ] One line in Notes: anything that changed',
    '- [ ] Close this issue',
  ].join('\n');
}
