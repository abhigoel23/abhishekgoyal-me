// Prerendered at build. Previews stay out of search through the X-Robots-Tag header in public/_headers,
// and /styleguide through its noindex meta (crawlers must be allowed to fetch a page to see noindex).
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  );
