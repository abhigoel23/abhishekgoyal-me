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
      /** Headline results shown under the title. Each must be traceable to the resume. */
      outcomes: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .max(4)
        .default([]),
      links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
      screens: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      /** Shown under the screenshots, e.g. why data is blurred. */
      screensNote: z.string().optional(),
    }),
});

// Blog posts. Drafts are excluded from production builds (see src/lib/posts.ts).
const writing = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/writing' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        /** Used for cards and the meta description. */
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        /** Only set when the post first ran elsewhere. */
        canonicalUrl: z.url().optional(),
      })
      .refine((data) => !data.heroImage || !!data.heroAlt, {
        message: 'heroAlt is required when heroImage is set',
        path: ['heroAlt'],
      }),
});

export const collections = { work, writing };
