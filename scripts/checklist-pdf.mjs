// Prints the built /checklist/print page to PDF (A4) for the checklist lead magnet.
//
//   node scripts/checklist-pdf.mjs → dist/client/checklist/offline-first-android-launch-checklist.pdf
//
// No page-count limit (unlike the resume), but fails if the route 404s or the PDF has zero pages.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checklistPdf } from '../src/data/checklist.ts';
import { printToPdf } from './print-pdf.mjs';

const root = fileURLToPath(new URL('../dist/client/', import.meta.url));
const out = join(root, checklistPdf.replace(/^\//, ''));

try {
  const { pageCount, size } = await printToPdf({
    path: '/checklist/print',
    out,
    root,
    checkPageCount: (pages) => {
      if (pages < 1) throw new Error('The checklist PDF has no pages.');
    },
  });
  console.log(`${out} (${pageCount} page${pageCount === 1 ? '' : 's'}, ${size} bytes)`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
