// Copy for the /writing index that isn't page metadata (see src/data/pages.ts for that).
export const writingCopy = {
  intro:
    'Notes on building mobile products end to end: architecture, offline-first sync and shipping to the stores.',
  empty: {
    title: 'First posts are on the way',
    body: "I'm writing up what I learned building HelperBook and Pulse. Until then, the case studies cover how they were built.",
    link: { label: 'Read the case studies →', href: '/work' },
  },
  // The home page "Latest writing" section (src/pages/index.astro). Rendered only once there are posts.
  home: {
    eyebrow: 'Writing',
    title: 'Latest writing',
    cardLink: 'Read the post →',
    link: { label: 'All writing →', href: '/writing' },
  },
  // The offer box at the end of a post (`offer` in front matter; src/components/PostOffer.astro).
  offer: {
    checklistLink: 'Get the checklist',
    serviceEyebrow: 'Work with me',
    serviceLink: 'How I can help',
  },
} as const;
