// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * @param {string} name
 * @param {`--${string}`} cssVariable
 * @param {[string | number, ...(string | number)[]]} weights
 * @param {string[]} fallbacks
 * @param {['normal' | 'italic', ...('normal' | 'italic')[]]} [styles]
 */
function font(name, cssVariable, weights, fallbacks, styles = ['normal']) {
  const provider = fontProviders.fontsource();
  /** @type {['latin']} */
  const subsets = ['latin'];
  return { provider, name, cssVariable, weights, styles, fallbacks, subsets };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://abhishekgoyal.me',
  trailingSlash: 'never',
  // Emit /page.html (not /page/index.html) so Workers static assets serve /page without a 307 to /page/.
  build: { format: 'file' },
  // No server sessions: stops the adapter provisioning a SESSION KV namespace we don't use.
  session: false,
  // Pages are prerendered by default; only src/pages/api/* opt out (prerender = false).
  // Images are optimised at build time, so no Cloudflare Images binding is needed.
  // Prerender in Node, not workerd: the share images (src/pages/og) use Satori + native resvg and read font
  // files at build time. On-demand routes (src/pages/api/*) still always run in workerd.
  adapter: cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),
  // Code blocks in posts: high-contrast GitHub themes pass WCAG AA (the default theme's comments don't).
  // The light colours are inline; global.css swaps in --shiki-dark when the site is in dark mode.
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
    },
  },
  integrations: [
    react(),
    mdx(),
    // /styleguide is an internal design reference and /thanks a post-submit confirmation: both noindex,
    // both kept out of the sitemap.
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        return !path.startsWith('/styleguide') && path !== '/thanks';
      },
    }),
  ],
  // Self-hosted via Fontsource at build time: no Google Fonts request, metric-matched fallbacks.
  // cssVariable names must match FontVar in src/lib/theme.ts.
  fonts: [
    font('Inter', '--font-inter', ['100 900'], ['sans-serif']),
    font('Instrument Serif', '--font-instrument-serif', [400], ['serif'], ['normal', 'italic']),
    font('JetBrains Mono', '--font-jetbrains-mono', ['100 800'], ['monospace']),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
