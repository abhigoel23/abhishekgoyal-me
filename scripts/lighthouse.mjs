// Lighthouse gate: audits every page in the sitemap (i.e. every indexable page) and fails if a gated
// category drops below 95 (see GATED).
//
// Runs against the built Worker (`pnpm build` first). It starts `wrangler dev` itself unless BASE_URL is set.
// Don't point it at a workers.dev preview: those send X-Robots-Tag: noindex on purpose, which fails SEO.
import { spawn } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';

// On PRs only accessibility and SEO fail the build: performance and best practices move with the
// runner's load. The nightly run against production gates all four (LIGHTHOUSE_GATE_ALL=1), where a
// dip opens an Issue instead of blocking a merge.
const GATED = process.env.LIGHTHOUSE_GATE_ALL
  ? { accessibility: 0.95, seo: 0.95, 'best-practices': 0.95, performance: 0.95 }
  : { accessibility: 0.95, seo: 0.95 };
const CATEGORIES = ['accessibility', 'seo', 'best-practices', 'performance'];
// Performance swings with the runner's load, so the nightly sets LIGHTHOUSE_RUNS=3 and gates on the
// median. The extra runs audit performance only. Other gated categories get one re-check on failure:
// a real problem fails twice, a slow fetch (e.g. robots.txt timing out) doesn't.
const RUNS = Math.max(1, Number.parseInt(process.env.LIGHTHOUSE_RUNS ?? '1', 10) || 1);
const PORT = 8788;
const DEBUG_PORT = 9223;

let server;
let base = process.env.BASE_URL;
if (!base) {
  base = `http://localhost:${PORT}`;
  server = spawn('pnpm', ['preview', '--port', String(PORT)], { stdio: 'ignore', detached: true });
  await waitFor(base);
}

let failed = false;
const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
try {
  const rows = [];
  for (const url of await sitemapUrls(base)) {
    const audit = (categories) =>
      lighthouse(url, { port: DEBUG_PORT, logLevel: 'error', onlyCategories: categories }).then(
        (r) => r.lhr,
      );
    const first = await audit(CATEGORIES);
    // lhr per category: the first run, except performance, which comes from the median run.
    const byCategory = Object.fromEntries(CATEGORIES.map((id) => [id, first]));
    if (RUNS > 1) {
      const perf = [first];
      for (let i = 1; i < RUNS; i++) perf.push(await audit(['performance']));
      perf.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
      byCategory.performance = perf[Math.floor(perf.length / 2)];
      console.log(
        `${new URL(url).pathname} performance runs: ${perf.map((r) => Math.round(r.categories.performance.score * 100)).join(', ')}`,
      );
    }
    for (const id of Object.keys(GATED)) {
      if (id === 'performance' || RUNS === 1 || byCategory[id].categories[id].score >= GATED[id])
        continue;
      const retry = await audit([id]);
      console.log(
        `${new URL(url).pathname} ${id}: re-checked, ${Math.round(retry.categories[id].score * 100)}`,
      );
      byCategory[id] = retry;
    }
    const scores = Object.fromEntries(
      CATEGORIES.map((id) => [id, Math.round(byCategory[id].categories[id].score * 100)]),
    );
    rows.push({ path: new URL(url).pathname, ...scores });

    for (const [id, min] of Object.entries(GATED)) {
      const lhr = byCategory[id];
      if (lhr.categories[id].score >= min) continue;
      failed = true;
      console.error(`\n✗ ${url} ${id} ${scores[id]} < ${min * 100}`);
      for (const ref of lhr.categories[id].auditRefs) {
        const audit = lhr.audits[ref.id];
        if (ref.weight > 0 && audit.score !== null && audit.score < 1)
          console.error(`  - ${audit.title}`);
      }
    }
  }
  console.table(rows);
  await writeSummary(rows);
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
process.exit(failed ? 1 : 0);

async function waitFor(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server at ${url} did not start`);
}

/** Page URLs from the sitemap, rewritten from the production origin to the server under test. */
async function sitemapUrls(origin) {
  const locs = async (path) =>
    [...(await (await fetch(new URL(path, origin))).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => new URL(m[1]).pathname,
    );
  const pages = [];
  for (const chunk of await locs('/sitemap-index.xml')) pages.push(...(await locs(chunk)));
  if (pages.length === 0) throw new Error('No pages found in the sitemap');
  return pages.map((path) => new URL(path, origin).href);
}

async function writeSummary(rows) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const header = `| Page | ${CATEGORIES.join(' | ')} |\n|---|${CATEGORIES.map(() => '---').join('|')}|\n`;
  const body = rows
    .map((r) => `| ${r.path} | ${CATEGORIES.map((c) => r[c]).join(' | ')} |`)
    .join('\n');
  const note = RUNS > 1 ? `Performance: median of ${RUNS} runs.\n\n` : '';
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Lighthouse\n\n${note}${header}${body}\n`);
}
