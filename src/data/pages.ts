// Title and description for every static page, keyed by path. SEO.astro uses them for meta tags, and
// src/pages/og/[...slug].png.ts renders one share image per entry (plus one per case study in
// src/content/work). Add a page here when you add a static route; the SEO e2e test fails if one is missing.
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
  '/work': {
    title: 'Work',
    description:
      'Case studies from 13 years of mobile engineering: HelperBook, the Pulse offline-sync engine and a video-first hiring app.',
    ogTitle: 'Case studies: mobile products taken from zero to shipped',
  },
  '/services': {
    title: 'Services',
    description:
      'Mobile engineering services: MVP builds, app rescue and modernisation, Kotlin Multiplatform migration and fractional mobile leadership.',
    ogTitle: 'MVP builds, app rescues, KMP migrations and fractional mobile leadership',
  },
  '/about': {
    title: 'About',
    description:
      'Abhishek Goyal is a mobile engineer in Gurugram with 13 years on Android and iOS, owning products end to end from architecture to release.',
    ogTitle: 'About Abhishek Goyal, mobile engineer in Gurugram',
  },
  '/styleguide': {
    title: 'Styleguide',
    description:
      'Design tokens and UI primitives for abhishekgoyal.me: colour, type, spacing and components.',
  },
} satisfies Record<string, PageMeta>;

export type PagePath = keyof typeof pages;
