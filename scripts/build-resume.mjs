// Prints resume/resume.html to resume/out/Abhishek-Goyal-Resume.pdf (A4) and fails if it
// overflows one page, so the resume can't silently grow to two pages.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const src = fileURLToPath(new URL('../resume/resume.html', import.meta.url));
const out = fileURLToPath(new URL('../resume/out/Abhishek-Goyal-Resume.pdf', import.meta.url));

await mkdir(fileURLToPath(new URL('../resume/out/', import.meta.url)), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href);
const pdf = await page.pdf({
  path: out,
  format: 'A4',
  preferCSSPageSize: true,
  printBackground: true,
});
await browser.close();

const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`${out} (${pages} page${pages === 1 ? '' : 's'})`);
if (pages !== 1) {
  console.error('Resume must fit on one A4 page.');
  process.exit(1);
}
