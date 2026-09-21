// Prints the built /resume page to PDF (A4) and fails if it isn't exactly one page.
//
//   node scripts/resume-pdf.mjs            → dist/client/resume.pdf (public; runs after `astro build`)
//   node scripts/resume-pdf.mjs --private  → resume/out/Abhishek-Goyal-Resume.pdf with the phone number from
//                                            RESUME_PHONE (never committed; the repo is public)
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../dist/client/', import.meta.url));
const isPrivate = process.argv.includes('--private');
const phone = process.env.RESUME_PHONE?.trim();
if (isPrivate && !phone) {
  console.error('Set RESUME_PHONE, e.g. RESUME_PHONE="+91 …" pnpm resume');
  process.exit(1);
}
const out = isPrivate
  ? fileURLToPath(new URL('../resume/out/Abhishek-Goyal-Resume.pdf', import.meta.url))
  : join(root, 'resume.pdf');

const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

// A tiny static server for dist/client: /resume → resume.html (build.format 'file').
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  const file = join(root, extname(path) ? path : `${path}.html`);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const response = await page.goto(`http://localhost:${port}/resume`);
  if (!response?.ok()) throw new Error(`/resume not found in ${root}. Run \`astro build\` first.`);
  await page.evaluate('document.fonts.ready.then(() => true)');
  if (isPrivate) {
    await page
      .locator('[data-phone]')
      .evaluate((el, value) => (el.textContent = ` · ${value}`), phone);
  }
  await mkdir(dirname(out), { recursive: true });
  const pdf = await page.pdf({
    path: out,
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
  });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`${out} (${pages} page${pages === 1 ? '' : 's'})`);
  if (pages !== 1)
    throw new Error('The resume must fit on one A4 page. Tighten the copy in src/data/career.ts.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
