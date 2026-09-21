// Share images (1200×630 PNG), one per entry in src/data/pages.ts, rendered at build time with Satori + resvg.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import { pages } from '../../data/pages';
import { profile } from '../../data/profile';
import { ogImagePath } from '../../lib/seo';
import { light } from '../../lib/theme';

const WIDTH = 1200;
const HEIGHT = 630;

export const getStaticPaths = (() =>
  Object.entries(pages).map(([path, page]) => ({
    params: { slug: ogImagePath(path).slice('/og/'.length, -'.png'.length) },
    props: { title: 'ogTitle' in page ? page.ogTitle : page.title },
  }))) satisfies GetStaticPaths;

// Satori takes a React-like element tree; this keeps it readable without JSX.
type Style = Record<string, string | number>;
type El = { type: 'div'; key: null; props: { style: Style; children: (El | string)[] } };
function h(style: Style, ...children: (El | string)[]): El {
  return { type: 'div', key: null, props: { style: { display: 'flex', ...style }, children } };
}

// Bundled builds move this file, so fonts are read relative to the project root that `astro build` runs in.
const font = (file: string) => readFile(join(process.cwd(), 'src/assets/og-fonts', file));
const fonts = Promise.all([
  font('inter-400.woff'),
  font('inter-600.woff'),
  font('instrument-serif-400.woff'),
]);

function card(title: string) {
  const serif = 'Instrument Serif';
  return h(
    {
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      backgroundColor: light.bg,
      color: light.ink,
      fontFamily: 'Inter',
    },
    h(
      { justifyContent: 'space-between', alignItems: 'center' },
      h(
        {
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 2.5,
          color: light.muted,
          textTransform: 'uppercase',
        },
        `${profile.name} · ${profile.jobTitle}`,
      ),
      h(
        {
          width: 72,
          height: 72,
          borderRadius: 14,
          backgroundColor: light.accent,
          color: light.bg,
          fontFamily: serif,
          fontSize: 38,
          alignItems: 'center',
          justifyContent: 'center',
        },
        'AG',
      ),
    ),
    h(
      {
        fontFamily: serif,
        fontSize: title.length > 60 ? 70 : 86,
        lineHeight: 1.05,
        letterSpacing: -1,
        maxWidth: 1000,
      },
      title,
    ),
    h(
      {
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: `2px solid ${light.line}`,
        paddingTop: 28,
        fontSize: 24,
      },
      h({ color: light.muted }, profile.pillars.join('  ·  ')),
      h({ color: light.accent, fontWeight: 600 }, new URL(profile.url).host),
    ),
  );
}

export const GET: APIRoute = async ({ props }) => {
  const [inter400, inter600, serif400] = await fonts;
  const svg = await satori(card(props.title as string) as unknown as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Inter', data: inter400, weight: 400, style: 'normal' },
      { name: 'Inter', data: inter600, weight: 600, style: 'normal' },
      { name: 'Instrument Serif', data: serif400, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
