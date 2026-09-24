// Prints the built /resume page to PDF (A4) and fails if it isn't exactly one page.
//
//   node scripts/resume-pdf.mjs            → dist/client/resume.pdf (public; runs after `astro build`)
//   node scripts/resume-pdf.mjs --private  → resume/out/Abhishek-Goyal-Resume.pdf with the phone number from
//                                            RESUME_PHONE (never committed; the repo is public)
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printToPdf } from './print-pdf.mjs';

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

try {
  const { pageCount } = await printToPdf({
    path: '/resume',
    out,
    root,
    prepare: isPrivate
      ? (page) =>
          page
            .locator('[data-phone]')
            .evaluate((el, value) => (el.textContent = ` · ${value}`), phone)
      : undefined,
    checkPageCount: (pages) => {
      if (pages !== 1)
        throw new Error(
          'The resume must fit on one A4 page. Tighten the copy in src/data/career.ts.',
        );
    },
  });
  console.log(`${out} (${pageCount} page${pageCount === 1 ? '' : 's'})`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
