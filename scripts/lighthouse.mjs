// Lighthouse gate: audits every page in the sitemap (i.e. every indexable page) and fails if Accessibility
// or SEO drops below 95. Performance and Best Practices are reported but don't fail the run.
//
// Runs against the built Worker (`pnpm build` first). It starts `wrangler dev` itself unless BASE_URL is set.
// Don't point it at a workers.dev preview: those send X-Robots-Tag: noindex on purpose, which fails SEO.
import { spawn } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';

const GATED = { accessibility: 0.95, seo: 0.95 };
const CATEGORIES = ['accessibility', 'seo', 'best-practices', 'performance'];
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
    const { lhr } = await lighthouse(url, {
      port: DEBUG_PORT,
      logLevel: 'error',
      onlyCategories: CATEGORIES,
    });
    const scores = Object.fromEntries(
      CATEGORIES.map((id) => [id, Math.round(lhr.categories[id].score * 100)]),
    );
    rows.push({ path: new URL(url).pathname, ...scores });

    for (const [id, min] of Object.entries(GATED)) {
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
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Lighthouse\n\n${header}${body}\n`);
}
