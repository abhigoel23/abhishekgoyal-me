# 001 — Astro with React islands

**Status:** accepted · 2026-09-21

We chose Astro, prerendering every page to static HTML, with React used only for interactive islands (the lead form and embeds). Compared with Next.js, React Router v7, Kobweb, and no-code builders, it gives the best SEO and page speed at no hosting cost, keeps React available where it helps, and makes MDX blogging simple. The trade-off is two component styles (`.astro` and `.tsx`). Shared state across islands is awkward, but this site rarely needs it.
