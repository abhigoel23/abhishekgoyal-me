// Home page section copy (src/pages/index.astro). The hero and stats come from src/data/profile.ts.
export const homeCopy = {
  work: {
    eyebrow: 'Selected work',
    title: 'Case studies',
    link: 'All case studies →',
  },
  services: {
    eyebrow: 'Services',
    title: 'Engagements',
    intro:
      'For founders and product teams who need a mobile app built, rescued or moved to shared code.',
    link: 'Services, process and FAQ →',
  },
  closing: {
    title: 'Planning a mobile build, rescue or migration?',
    body: 'Tell me what exists today and what you need by when.',
  },
} as const;
