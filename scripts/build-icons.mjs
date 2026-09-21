// Generates the favicon set in public/ from the design tokens: an "AG" monogram set in Instrument Serif,
// converted to paths so it renders the same in every browser. Run `pnpm icons` after changing the
// accent colour; the outputs are committed.
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import opentype from 'opentype.js';
import { light } from '../src/lib/theme.ts';

const FONT_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/instrument-serif@latest/latin-400-normal.woff';
const TEXT = 'AG';
const out = (name) => new URL(`../public/${name}`, import.meta.url);

const response = await fetch(FONT_URL);
if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
const font = opentype.parse(await response.arrayBuffer());

// Lays glyphs out by hand (advance + kerning): opentype.js's shaper chokes on this font's ccmp table.
function textPath(x, y, fontSize) {
  const glyphs = [...TEXT].map((char) => font.charToGlyph(char));
  const path = new opentype.Path();
  const scale = fontSize / font.unitsPerEm;
  glyphs.forEach((glyph, i) => {
    path.extend(glyph.getPath(x, y, fontSize));
    const kern = glyphs[i + 1] ? font.getKerningValue(glyph, glyphs[i + 1]) : 0;
    x += (glyph.advanceWidth + kern) * scale;
  });
  return path;
}

/** A square SVG: accent background, monogram in the page background colour, centred on its bounding box. */
function monogram({ radius, glyphWidth, size = 512 }) {
  const box = textPath(0, 0, 100).getBoundingBox();
  const fontSize = (100 * size * glyphWidth) / (box.x2 - box.x1);
  const k = fontSize / 100;
  const x = (size - (box.x2 - box.x1) * k) / 2 - box.x1 * k;
  const y = (size - (box.y2 - box.y1) * k) / 2 - box.y1 * k;
  const d = textPath(x, y, fontSize).toPathData(1);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${light.accent}"/>` +
    `<path d="${d}" fill="${light.bg}"/></svg>\n`
  );
}

const rounded = monogram({ radius: 112, glyphWidth: 0.72 });
const small = monogram({ radius: 96, glyphWidth: 0.82 }); // bigger glyphs survive 16–48px
const square = monogram({ radius: 0, glyphWidth: 0.62 }); // iOS applies its own mask
const maskable = monogram({ radius: 0, glyphWidth: 0.5 }); // inside the 80% safe zone

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg, px) {
  await page.setViewportSize({ width: px, height: px });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style><img src="${src}" width="${px}" height="${px}">`,
  );
  return page.screenshot({ type: 'png', omitBackground: true });
}

/** An .ico holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ px, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(px >= 256 ? 0 : px, entry);
    header.writeUInt8(px >= 256 ? 0 : px, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const icoImages = [];
for (const px of [16, 32, 48]) icoImages.push({ px, data: await png(small, px) });

const files = {
  'favicon.svg': rounded,
  'favicon.ico': ico(icoImages),
  'apple-touch-icon.png': await png(square, 180),
  'icon-192.png': await png(rounded, 192),
  'icon-512.png': await png(rounded, 512),
  'icon-maskable-512.png': await png(maskable, 512),
};
await browser.close();

for (const [name, data] of Object.entries(files)) {
  await writeFile(out(name), data);
  console.log(`public/${name}`);
}
