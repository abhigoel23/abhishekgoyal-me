// Web app manifest, built from profile.ts and the design tokens. Icons come from `pnpm icons`.
import type { APIRoute } from 'astro';
import { profile } from '../data/profile';
import { light } from '../lib/theme';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: profile.name,
      short_name: 'Abhishek G',
      description: profile.positioning,
      start_url: '/',
      display: 'browser',
      background_color: light.bg,
      theme_color: light.bg,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
