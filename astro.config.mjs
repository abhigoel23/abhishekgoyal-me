// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://abhishekgoyal.me',
  trailingSlash: 'never',
  // No server sessions: stops the adapter provisioning a SESSION KV namespace we don't use.
  session: false,
  // Pages are prerendered by default; only src/pages/api/* opt out (prerender = false).
  // Images are optimised at build time, so no Cloudflare Images binding is needed.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [react(), mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
