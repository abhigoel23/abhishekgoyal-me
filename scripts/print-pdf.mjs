// Shared static server + print-to-PDF logic for scripts/resume-pdf.mjs and scripts/checklist-pdf.mjs.
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

const distRoot = fileURLToPath(new URL('../dist/client/', import.meta.url));

// A tiny static server for dist/client: /path → path.html (build.format 'file').
function startServer(root) {
  return new Promise((resolve) => {
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
    server.listen(0, () => resolve(server));
  });
}

/**
 * Prints `path` (served from `dist/client/`) to a PDF at `out`.
 *
 * @param {object} options
 * @param {string} options.path - Route to print, e.g. `/resume`.
 * @param {string} options.out - Absolute output path for the PDF.
 * @param {string} [options.root] - Static root to serve, defaults to dist/client.
 * @param {(page: import('@playwright/test').Page) => Promise<void>} [options.prepare] - Run after the
 *   page loads and fonts are ready, before printing (e.g. filling in `[data-phone]`).
 * @param {(pageCount: number) => void} [options.checkPageCount] - Throw to fail the build.
 * @returns {Promise<{ path: string; pageCount: number; size: number }>}
 */
export async function printToPdf({ path, out, root = distRoot, prepare, checkPageCount }) {
  const server = await startServer(root);
  const { port } = server.address();

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const response = await page.goto(`http://localhost:${port}${path}`);
    if (!response?.ok())
      throw new Error(`${path} not found in ${root}. Run \`astro build\` first.`);
    await page.evaluate('document.fonts.ready.then(() => true)');
    if (prepare) await prepare(page);
    await mkdir(dirname(out), { recursive: true });
    const pdf = await page.pdf({
      path: out,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
    });
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    if (checkPageCount) checkPageCount(pageCount);
    return { path: out, pageCount, size: pdf.length };
  } finally {
    await browser.close();
    server.close();
  }
}
