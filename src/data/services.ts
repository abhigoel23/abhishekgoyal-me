// Services page content. Proof links point at case studies; claims about past work must match the resume.

export type Service = {
  id: string;
  title: string;
  summary: string;
  includes: string[];
  proof: { label: string; href: string };
};

export const services: Service[] = [
  {
    id: 'mvp',
    title: 'MVP build',
    summary:
      'Take an idea to an app in the store. Native Android, Kotlin Multiplatform or React Native, chosen for your product and team rather than my preference.',
    includes: [
      'Scoping the first release with you',
      'Architecture and data model, offline-first where it matters',
      'The app itself, in Jetpack Compose or your chosen stack',
      'Store release: signing, Data Safety, staged rollout',
    ],
    proof: { label: 'HelperBook case study', href: '/work/helperbook' },
  },
  {
    id: 'rescue',
    title: 'App rescue and modernisation',
    summary:
      'For apps that have become hard to change or release. Stabilise first, then modernise in steps you can ship.',
    includes: [
      'Codebase and release-process audit',
      'Architecture plan with an incremental migration path',
      'Compose migration, dependency and SDK upgrades',
      'CI/CD with GitHub Actions and Fastlane',
    ],
    proof: { label: 'Pulse case study', href: '/work/pulse' },
  },
  {
    id: 'kmp',
    title: 'Kotlin Multiplatform migration',
    summary:
      'Share business logic and data between Android and iOS with Kotlin Multiplatform, one module at a time.',
    includes: [
      'Deciding what to share and what stays native',
      'Shared module design with a SQLDelight data layer',
      'Incremental adoption alongside your existing apps',
      'Build and release setup for both platforms',
    ],
    proof: { label: 'HelperBook case study', href: '/work/helperbook' },
  },
  {
    id: 'fractional',
    title: 'Fractional mobile lead',
    summary:
      'Part-time ownership of your mobile side when you need senior judgement but not a full-time hire yet.',
    includes: [
      'Architecture and technology decisions',
      'Release process and quality bar',
      'Code reviews and working with your backend and web teams',
      'Helping you hire your first mobile engineers',
    ],
    proof: { label: 'Pulse case study', href: '/work/pulse' },
  },
];

export const process = [
  {
    title: 'Discovery',
    body: 'A short, paid sprint to understand the product, the code (if any) and the constraints. You get a written plan and estimate you can use with anyone.',
  },
  {
    title: 'Build in short cycles',
    body: 'Working builds on a test track every week or two, so you see progress on a real phone, not in slides.',
  },
  {
    title: 'Release',
    body: 'Signing, store listings, Data Safety and a staged rollout on Google Play and the App Store.',
  },
  {
    title: 'Handover',
    body: 'The code transferred to your repository at each paid milestone, CI in place and the decisions written down, so your team can take over.',
  },
];

export const engagements = [
  {
    title: 'Paid discovery',
    body: 'A fixed-fee sprint of 1–2 weeks: audit or product scoping, ending in a plan and estimate.',
    recommended: true,
  },
  {
    title: 'Fixed-scope project',
    body: 'An agreed scope, timeline and price. Best when the first release is well defined.',
    recommended: false,
  },
  {
    title: 'Time and materials',
    body: 'Billed by the day or week against a plan. Best for rescues where the scope becomes clear as we go.',
    recommended: false,
  },
  {
    title: 'Monthly retainer',
    body: 'A set number of days each month, for ongoing work or as your fractional mobile lead.',
    recommended: false,
  },
];

export const workingLocation = 'Remote worldwide from Gurugram (IST), and on-site in Delhi NCR.';
export const overlap = 'I keep a few hours of overlap with European and US mornings.';

export const faqs = [
  {
    question: 'Do you work remotely?',
    answer: `Yes. ${workingLocation} ${overlap}`,
  },
  {
    question: 'Native, Kotlin Multiplatform or React Native?',
    answer:
      'I have shipped all three in production: native Android and iOS apps, a shared Kotlin Multiplatform module in HelperBook, and a full React Native rewrite of the Pulse apps. I recommend one based on your team, timeline and which parts must be native.',
  },
  {
    question: 'Can you work with our existing team?',
    answer:
      'Yes. At Pulse I designed the sync contract with the backend and web teams and led the React Native rewrite alongside the team.',
  },
  {
    question: 'Do you handle the Play Store and App Store release?',
    answer:
      'Yes: signing, R8, Play Data Safety declarations, store listings and staged rollouts. I have shipped apps to both stores.',
  },
  {
    question: 'Who owns the code?',
    answer:
      'You do, once each milestone is paid. I work in my repository, give you read access from the start so you can see every commit, and transfer the code to yours at each paid milestone.',
  },
  {
    question: 'How do we start?',
    answer:
      'Usually with a paid discovery sprint. It gives you a written plan and estimate, and gives us both a low-risk way to see if we work well together.',
  },
];
