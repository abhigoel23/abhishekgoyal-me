// Title and description for every static page, keyed by path. SEO.astro uses them for meta tags, and
// src/pages/og/[...slug].png.ts renders one share image per entry. Add a page here when you add a route;
// the SEO e2e test fails if a page's share image is missing.
import { profile } from './profile';

export type PageMeta = {
  title: string;
  description: string;
  /** Headline on the share image, if it should differ from the title. */
  ogTitle?: string;
};

export const pages = {
  '/': {
    title: `${profile.name} — ${profile.jobTitle}`,
    description: profile.positioning,
    ogTitle: profile.positioning,
  },
  '/styleguide': {
    title: 'Styleguide',
    description:
      'Design tokens and UI primitives for abhishekgoyal.me: colour, type, spacing and components.',
  },
} satisfies Record<string, PageMeta>;

export type PagePath = keyof typeof pages;
