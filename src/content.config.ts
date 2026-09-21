import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Case studies. Every fact must be traceable to resume/resume.html (see CLAUDE.md).
const work = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** One or two sentences for cards, meta description and the page lead. */
      summary: z.string(),
      role: z.string(),
      period: z.string(),
      /** Who it was for, as it may be named publicly. */
      client: z.string(),
      platform: z.string(),
      stack: z.array(z.string()),
      order: z.number(),
      featured: z.boolean().default(true),
      links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
      screens: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      /** Shown under the screenshots, e.g. why data is blurred. */
      screensNote: z.string().optional(),
    }),
});

export const collections = { work };
