// Writes the monthly review issue's title and body (src/lib/monthlyReview.ts) to monthly-review.json,
// for .github/workflows/monthly-review.yml. MONTH=YYYY-MM overrides the default (last month, UTC);
// SITEMAP_URLS adds the live sitemap's URL count. No numbers from D1: the repo is public.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { profile } from '../src/data/profile.ts';
import { services } from '../src/data/services.ts';
import { isMonth, lastMonth, reviewBody, reviewTitle } from '../src/lib/monthlyReview.ts';
import { parseFrontMatter } from '../src/lib/share.ts';

const month = process.env.MONTH || lastMonth(new Date());
if (!isMonth(month)) {
  console.error(`MONTH must be YYYY-MM, got "${month}"`);
  process.exit(1);
}

const dir = fileURLToPath(new URL('../src/content/writing/', import.meta.url));
const posts = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => ({
    slug: f.slice(0, -'.mdx'.length),
    ...parseFrontMatter(readFileSync(dir + f, 'utf8')),
  }))
  .filter((p) => !p.draft && p.pubDate.startsWith(month))
  .sort((a, b) => a.pubDate.localeCompare(b.pubDate))
  .map((p) => ({ title: p.title, url: `${profile.url}/writing/${p.slug}` }));

// Every service with its own page, and the query it's written for (docs/SEO.md).
const searchTargets = services.flatMap((s) =>
  s.page ? [{ url: `${profile.url}/services/${s.id}`, query: s.page.query }] : [],
);

const sitemap = Number.parseInt(process.env.SITEMAP_URLS ?? '', 10);
const repo = process.env.GITHUB_REPOSITORY ?? 'abhigoel23/abhishekgoyal-me';
const issue = {
  title: reviewTitle(month),
  body: reviewBody(month, posts, repo, Number.isNaN(sitemap) ? undefined : sitemap, searchTargets),
};
writeFileSync('monthly-review.json', JSON.stringify(issue));
console.log(`${issue.title}\n\n${issue.body}`);
