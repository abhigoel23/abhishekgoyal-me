// Home page section copy (src/pages/index.astro). The hero and stats come from src/data/profile.ts; the
// engagement models and process from src/data/services.ts. Every fact must match src/data/career.ts.
export const homeCopy = {
  work: {
    eyebrow: 'Selected client work',
    title: 'Case studies',
    flagship: 'Flagship',
    link: 'All work, including my own product HelperBook →',
  },
  outcomes: {
    eyebrow: 'Earlier client work',
    title: 'Outcomes, under NDA',
    intro: 'Role, domain and what shipped. Client names stay private.',
  },
  engagements: {
    eyebrow: 'Engagement models',
    title: 'How we can work together',
    intro:
      'For founders and product teams who need a mobile app built, rescued or moved to shared code.',
    columns: { model: 'Model', terms: 'Terms' },
    recommended: 'Usual start',
    link: 'Services, process and FAQ →',
  },
  process: {
    eyebrow: 'How I work',
    title: 'Four steps, from plan to handover',
  },
  credentials: {
    eyebrow: 'Credentials',
    title: 'A registered business, not a side project',
    // Same order as profile.credentials.
    notes: [
      'GST invoices for Indian clients.',
      'A verified Dun & Bradstreet business identity.',
      'Apps released under a verified organization account on Google Play.',
    ],
  },
  closing: {
    title: 'Planning a mobile build, rescue or migration?',
    body: 'Tell me what exists today and what you need by when.',
  },
} as const;

/**
 * NDA-safe outcome cards: role · domain · outcome, no client names. Sources in career.ts: the Redquanta
 * retail audit apps and EzHealth Track (Startup Techies).
 */
export const ndaOutcomes = [
  {
    role: 'Senior Software Engineer',
    domain: 'Retail and FMCG audits',
    period: '2018 – 2021',
    value: '10,000+',
    valueLabel: 'daily active users',
    outcome:
      'Enterprise Android and iOS audit apps for field reps, tuned for low memory and fast cold start on the low-end phones field teams carried.',
  },
  {
    role: 'Senior Software Engineer',
    domain: 'Healthcare',
    period: '2013 – 2017',
    value: 'Offline-first',
    valueLabel: 'with bidirectional sync',
    outcome:
      'A tablet app for doctors that works with no connection and syncs both ways with the server when it’s back.',
  },
] as const;

/**
 * The hero diagram: the offline-first sync pattern behind Pulse, top to bottom. `network` marks the hop that
 * can wait for a connection.
 */
export const syncDiagram = {
  title: 'Offline-first sync, as built for Pulse',
  description:
    'Work is saved to SQLite on the device, queued for upload, sent to the API when there is signal, and shown on the team’s dashboard.',
  nodes: [
    { label: 'Device · SQLite', note: 'saved the moment it’s entered' },
    { label: 'Upload queue', note: 'forms and photos, retried in background' },
    { label: 'API', note: 'sync contract agreed with backend' },
    { label: 'Dashboard', note: 'what the server has, for the team' },
  ],
  network: 'no signal? the queue waits',
  caption:
    'The pattern behind Pulse: inspections of 500+ questions and 1,000+ photos, with no data-loss incidents in 4.5 years.',
} as const;
