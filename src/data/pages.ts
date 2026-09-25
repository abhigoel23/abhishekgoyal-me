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
  // The titles and descriptions for /, /work and /services name what people search for (docs/SEO.md),
  // not just the name: only people who already know him search for that. Share images keep their own
  // headlines (ogTitle).
  '/': {
    title: `${profile.name} — Android, iOS and offline-first mobile app developer`,
    description:
      'Mobile app developer for startups and product teams: Android, iOS, Kotlin Multiplatform and React Native. 13 years, from MVPs to an app with 20,000+ users.',
    ogTitle: profile.positioning,
  },
  '/work': {
    title: 'Mobile app case studies',
    description:
      'Mobile app case studies: an offline-first inspection app with 20,000+ field users, a household salary app on a shared KMP data layer, and a video hiring app.',
    ogTitle: 'Case studies: mobile products taken from zero to shipped',
  },
  '/services': {
    title: 'Mobile app development services',
    description:
      'Mobile app development for startups: MVP builds, offline-first apps, app rescue and Compose migration, Kotlin Multiplatform and fractional mobile leadership.',
    ogTitle: 'MVP builds, app rescues, KMP migrations and fractional mobile leadership',
  },
  '/writing': {
    title: 'Writing',
    description:
      'Notes on mobile engineering from Abhishek Goyal: architecture, offline-first sync and lessons from shipping Android and iOS products.',
    ogTitle: 'Notes on mobile engineering: architecture, offline-first sync and shipping',
  },
  '/about': {
    title: 'About',
    description:
      'Abhishek Goyal is a mobile engineer in Gurugram with 13 years on Android and iOS, owning products end to end from architecture to release.',
    ogTitle: 'About Abhishek Goyal, mobile engineer in Gurugram',
  },
  '/hire': {
    title: 'Hire me',
    description:
      'Hiring a mobile engineer? Abhishek Goyal is open to full-time roles owning mobile end to end: remote, or hybrid or on-site in Delhi NCR.',
    ogTitle: 'Hiring a mobile engineer? Resume, availability and how to reach me',
  },
  '/resume': {
    title: 'Resume',
    description:
      'Resume of Abhishek Goyal, Hands-on Mobile Architect: Android, Kotlin, Compose, KMP, native iOS and React Native. 13 years, 0-to-1 builds.',
    ogTitle: 'Resume: Hands-on Mobile Architect, 13 years on Android and iOS',
  },
  '/contact': {
    title: 'Contact',
    description:
      'Start a project or ask about a full-time role. Tell Abhishek Goyal what you need and hear back within 2 working days.',
    ogTitle: 'Start a project, or ask about a full-time role',
  },
  '/checklist': {
    title: 'Offline-first Android launch checklist',
    description:
      'A free, practical checklist to run through before you ship an Android app that has to work without a connection: data model, sync, uploads, conflicts, privacy and release engineering.',
  },
  '/checklist/print': {
    title: 'Offline-first Android launch checklist (printable)',
    description:
      'The printable, downloadable version of the offline-first Android launch checklist.',
  },
  '/subscribe/confirm': {
    title: 'Confirm your email',
    description: 'Confirm your email address to get the offline-first Android launch checklist.',
  },
  '/thanks': {
    title: 'Thanks',
    description:
      'Your message is in. Abhishek Goyal replies to every enquiry within 2 working days.',
  },
  '/privacy': {
    title: 'Privacy',
    description:
      'What abhishekgoyal.me collects (very little), why, who processes it, how long it is kept, and how to reach me about your data.',
  },
  '/404': {
    title: 'Page not found',
    description: 'This page doesn’t exist. Try the case studies, services or the home page.',
  },
  '/styleguide': {
    title: 'Styleguide',
    description:
      'Design tokens and UI primitives for abhishekgoyal.me: colour, type, spacing and components.',
  },
} satisfies Record<string, PageMeta>;

export type PagePath = keyof typeof pages;
