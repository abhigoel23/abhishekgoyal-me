// Services page content. Proof links point at case studies; claims about past work must match the resume.

/**
 * A service's own landing page at /services/<id>, written for one search query (docs/SEO.md). Services
 * without one stay as cards on /services.
 */
export type ServicePage = {
  /** The search query this page is written for (docs/SEO.md). Not rendered. */
  query: string;
  /** Browser title, before " · Abhishek Goyal". */
  title: string;
  description: string;
  heading: string;
  intro: string;
  /** "Sounds familiar?": the searcher's problems, in their words. */
  problems: string[];
  /** Heading over the approach steps. */
  approachTitle: string;
  approach: { title: string; body: string }[];
  /** Headline numbers from the resume, shown as a proof strip. */
  outcomes: { value: string; label: string }[];
  faqs: { question: string; answer: string }[];
  related: { label: string; href: string }[];
  /** Heading of the closing call to action. */
  ctaHeading: string;
};

export type Service = {
  id: string;
  title: string;
  summary: string;
  includes: string[];
  proof: { label: string; href: string };
  page?: ServicePage;
  /** false: the page is built, but the service isn't a card on /services, an option on the contact form or
   * an offer in the catalog JSON-LD (e.g. the India page, which is about where, not what). */
  listed?: boolean;
  /** schema.org areaServed for the page's Service JSON-LD. Defaults to worldwide. */
  areaServed?: string;
};

// Shared by the /services FAQ and the MVP page.
const codeOwnership =
  'You do, once each milestone is paid. I work in my repository, give you read access from the start so you can see every commit, and transfer the code to yours at each paid milestone.';

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
      'A simple backend when you need one, in Firebase or Django',
      'Store release: signing, Data Safety, staged rollout',
    ],
    proof: { label: 'HelperBook case study', href: '/work/helperbook' },
    page: {
      query: 'mvp app development for startups',
      title: 'MVP app development for startups',
      description:
        'MVP app development for startups: scope the first release, choose native, Kotlin Multiplatform or React Native, and ship to Google Play and the App Store. From an engineer who has owned four greenfield Android builds end to end.',
      heading: 'Your startup’s MVP app, from the first plan to the store',
      intro:
        'I take startup apps from an idea to a release in the store: scoping the first version with you, choosing the stack for your product and team, building it, and handling the release. I’ve owned four greenfield Android builds end to end.',
      problems: [
        'You have a product idea and a deadline, but no mobile engineer yet.',
        'You need to decide what the first release must do, and what can wait.',
        'You’re not sure whether to go native, Kotlin Multiplatform or React Native.',
        'You want an app your own team can take over later, not one only its builder understands.',
      ],
      approachTitle: 'How I take an MVP to the store',
      approach: [
        {
          title: 'Scope the first release',
          body: 'We agree what the first version must do and what can wait, in a paid discovery sprint that ends in a written plan and estimate you can use with anyone.',
        },
        {
          title: 'Choose the stack for your product',
          body: 'Native Android, Kotlin Multiplatform or React Native, chosen for your product, team and timeline rather than my preference. I’ve shipped all three to production.',
        },
        {
          title: 'An architecture that outlives the MVP',
          body: 'For a video-first hiring platform I built 100% of the Android client, 30+ screens across candidate and recruiter flows, on a modular Compose, MVVM, Hilt and Flow codebase the app still runs on.',
        },
        {
          title: 'Working builds every week or two',
          body: 'You get builds on a test track as the app grows, so you see progress on a real phone, not in slides.',
        },
        {
          title: 'A release you can trust',
          body: 'Signing, R8, Play Data Safety declarations, crash reporting with no personal data in it, and a staged rollout. HelperBook went from its first commit to a public release on Google Play this way.',
        },
      ],
      outcomes: [
        { value: '4', label: 'greenfield Android builds, owned end to end' },
        { value: '30+', label: 'screens built from concept to production release' },
        { value: '100+', label: 'B2B clients on an app I took from early prototype' },
        { value: '13', label: 'years building Android and iOS apps' },
      ],
      faqs: [
        {
          question: 'What does an MVP cost?',
          answer:
            'Every MVP starts with a paid discovery sprint: a fixed ₹60,000 (US$900) for about a week. It ends in a written plan and an estimate for the build, which you can use with me or anyone else.',
        },
        {
          question: 'Android, iOS or both?',
          answer:
            'Whatever your users need first. I’ve shipped native Android and iOS apps, a shared Kotlin Multiplatform data layer and a React Native app, so the choice follows your product rather than what I know.',
        },
        {
          question: 'Do you build the backend too?',
          answer:
            'When the MVP needs a simple one, yes: I’ve shipped backends on Firebase and Django. For bigger systems I work with your backend team from an agreed API contract, as I did at Pulse.',
        },
        {
          question: 'Who owns the code?',
          answer: codeOwnership,
        },
      ],
      related: [
        { label: 'HelperBook: from first commit to Google Play', href: '/work/helperbook' },
        { label: 'Video-first hiring app: 100% of the Android client', href: '/work/video-hiring' },
        { label: 'Pulse: from early prototype to 100+ enterprise clients', href: '/work/pulse' },
      ],
      ctaHeading: 'Tell me about the app you want to launch',
    },
  },
  {
    id: 'offline-first',
    title: 'Offline-first apps',
    summary:
      'Apps that keep working with no signal and never lose what people entered: the phone as the source of truth, and sync designed with your backend team rather than bolted on.',
    includes: [
      'A data model with the device as the source of truth',
      'A sync contract agreed with your backend team',
      'Background upload queues for photos and files',
      'Conflict handling and sync status people can see',
    ],
    proof: { label: 'Pulse case study', href: '/work/pulse' },
    page: {
      query: 'offline first mobile app',
      title: 'Offline-first mobile app development',
      description:
        'Offline-first Android and iOS app development: local-first data, sync designed with your backend, reliable background uploads and conflict handling. Proven on an app with 20,000+ field users and no data-loss incidents in 4.5 years.',
      heading: 'Offline-first mobile apps that don’t lose your users’ work',
      intro:
        'Your users work where the signal doesn’t reach: on site, in the field, on the move. I build apps where the phone’s database is the source of truth and sync is designed up front, so work is never blocked by a missing connection and never lost when it comes back.',
      problems: [
        'People lose work when the connection drops, or can’t start until it comes back.',
        'Photos and files upload unreliably, and nobody can tell what actually reached the server.',
        'A record edited on two devices ends up with one version silently overwriting the other.',
        'The app works in the office and fails in the field.',
      ],
      approachTitle: 'What makes it hold up in the field',
      approach: [
        {
          title: 'Contract before code',
          body: 'I agree the sync contract with your backend team first: payloads, upload semantics and what happens when something fails. Then both sides build against it.',
        },
        {
          title: 'The phone is the source of truth',
          body: 'Work is saved to a local database the moment it’s entered. A new record gets a local ID straight away and is remapped when the server assigns one, and retries reuse that ID, so a flaky connection never creates duplicates.',
        },
        {
          title: 'Uploads that can’t block each other',
          body: 'Photos go up in the background while people keep working, and a form is only submitted once its media is confirmed. A failed upload is marked, retried and, if it fails again, raised with the user. It never holds up the rest of the queue.',
        },
        {
          title: 'Sync people can see',
          body: 'The app shows what’s still uploading, so “I submitted it” and “the server has it” are never confused. When a record was changed on two devices, the user is warned and can keep their version instead of losing it silently.',
        },
        {
          title: 'No server at all, when that’s better',
          body: 'Some data shouldn’t leave the phone. HelperBook keeps household wage records on the device only, with user-owned export and restore, which keeps it outside data-fiduciary scope under India’s DPDP Act.',
        },
      ],
      outcomes: [
        { value: '20,000+', label: 'field users in 10+ countries on an offline-first app I led' },
        { value: '0', label: 'data-loss incidents reported in 4.5 years of field use' },
        { value: '500+', label: 'questions in a single inspection, filled in offline' },
        { value: '1,000+', label: 'photos per inspection, uploaded in the background' },
      ],
      faqs: [
        {
          question: 'Do I need offline-first, or is caching enough?',
          answer:
            'Caching helps people read data they’ve already loaded. If they need to create or change data without a connection, and that work must not be lost, you need offline-first: a local database, a sync queue and a plan for conflicts.',
        },
        {
          question: 'Can you add offline support to an existing app?',
          answer:
            'Yes, usually one flow at a time: start with the screens where people create data, move them onto a local database, then add the upload queue and sync. A paid discovery sprint maps which flows matter and in what order.',
        },
        {
          question: 'Android only, or iOS too?',
          answer:
            'Both. The Pulse offline engine ran in native Android (Kotlin) and iOS (Swift) clients at feature parity, and later in one React Native codebase.',
        },
        {
          question: 'What about sensitive data?',
          answer:
            'If data doesn’t need to leave the phone, it shouldn’t. HelperBook keeps wage records on the device only, and its crash reports carry no names or amounts.',
        },
      ],
      related: [
        {
          label: 'Pulse: offline-first inspections for 100+ enterprise clients',
          href: '/work/pulse',
        },
        { label: 'HelperBook: a local-only Android app', href: '/work/helperbook' },
        {
          label: 'Offline-first with a server: lessons from Pulse’s sync engine',
          href: '/writing/offline-first-sync-lessons',
        },
        {
          label: 'Offline-first with no server: why HelperBook is local-only',
          href: '/writing/offline-first-without-a-server',
        },
      ],
      ctaHeading: 'Tell me where your users lose signal',
    },
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
    page: {
      query: 'migrate xml to jetpack compose',
      title: 'Android app rescue, modernisation and Compose migration',
      description:
        'Android app rescue and modernisation: make releases routine with CI/CD, fix what hurts users first, and move from XML layouts to Jetpack Compose one screen at a time, without stopping releases.',
      heading: 'Rescue and modernise your Android app, without stopping releases',
      intro:
        'For apps that have become hard to change or release. I stabilise first, then modernise in steps you can ship: the release pipeline, the architecture, and the move from XML layouts to Jetpack Compose, one screen at a time.',
      problems: [
        'Every release is a manual, stressful event, and a hotfix takes days.',
        'Small changes break unrelated screens, so nobody wants to touch the old code.',
        'The UI is still in XML layouts, and new screens are slow to build.',
        'The app freezes, loses data or starts slowly on the phones your users actually carry.',
      ],
      approachTitle: 'Stabilise first, then modernise in steps',
      approach: [
        {
          title: 'Audit the code and the release process',
          body: 'A paid discovery sprint looks at the codebase, the build and the way releases happen, and ends in a written plan with an incremental migration path.',
        },
        {
          title: 'Make releases routine',
          body: 'At Pulse I replaced manual builds with GitHub Actions and Fastlane: a predictable bi-weekly cadence and same-day hotfixes. That comes first, so every later change ships safely.',
        },
        {
          title: 'Fix what hurts users first',
          body: 'At Pulse, one failed photo could stall the whole upload queue. The fix gave each photo its own failed state and a retry, so the rest kept moving. Rescue work starts with problems like that.',
        },
        {
          title: 'Move to Compose one screen at a time',
          body: 'New screens are built in Jetpack Compose and existing XML screens move over as they’re worked on, so the app keeps shipping throughout. I build production apps in Compose, including 30+ screens on a modular Compose, MVVM, Hilt and Flow codebase.',
        },
        {
          title: 'Know when a rewrite is the right call',
          body: 'Sometimes steps aren’t enough. In 2025 I led the rewrite of two native apps into one React Native codebase in six months, and it replaced both in production.',
        },
      ],
      outcomes: [
        { value: 'Bi-weekly', label: 'releases after replacing manual builds with CI/CD' },
        { value: 'Same-day', label: 'hotfixes once the release pipeline was in place' },
        { value: '30+', label: 'Compose screens built from concept to production' },
        { value: '6 months', label: 'to move two native apps onto one codebase' },
      ],
      faqs: [
        {
          question: 'Do we have to stop feature work?',
          answer:
            'No. The plan is incremental: releases keep going while the code improves, and each step ships on its own.',
        },
        {
          question: 'Should we migrate to Jetpack Compose?',
          answer:
            'Usually yes for new screens. Compose and XML views can live in the same app, so there’s no big-bang switch. Whether to move older screens depends on how often they change.',
        },
        {
          question: 'Refactor or rewrite?',
          answer:
            'Refactor by default, because it keeps releases going. A rewrite makes sense when the platform choice itself is the problem, as with Pulse’s two native apps, which I led into one React Native codebase.',
        },
        {
          question: 'Can you work with our existing team?',
          answer:
            'Yes. At Pulse I led a team of 4–6 mobile engineers and set the code-review, sprint and release process.',
        },
      ],
      related: [
        {
          label: 'Pulse: releases, the upload queue and the React Native rewrite',
          href: '/work/pulse',
        },
        { label: 'Video-first hiring app: 30+ Compose screens', href: '/work/video-hiring' },
        { label: 'HelperBook: release engineering for a Compose app', href: '/work/helperbook' },
      ],
      ctaHeading: 'Tell me what’s hard to change in your app',
    },
  },
  {
    id: 'kmp',
    title: 'Kotlin Multiplatform migration',
    summary:
      'Start sharing code between Android and iOS with a Kotlin Multiplatform data layer, the way HelperBook does, then grow it one module at a time.',
    includes: [
      'Deciding what to share and what stays native',
      'Shared module design with a SQLDelight data layer',
      'Incremental adoption alongside your existing apps',
      'Build setup for the shared module in your existing release process',
    ],
    proof: { label: 'HelperBook case study', href: '/work/helperbook' },
    page: {
      query: 'is kotlin multiplatform worth it',
      title: 'Kotlin Multiplatform development and adoption',
      description:
        'Kotlin Multiplatform development: decide what to share between Android and iOS, start with a shared SQLDelight data layer, and adopt it without a rewrite. From an engineer who has shipped native, Kotlin Multiplatform and React Native apps.',
      heading: 'Is Kotlin Multiplatform worth it for your app? Start with the data layer',
      intro:
        'Kotlin Multiplatform lets Android and iOS share business logic and data while each keeps a fully native UI. I help teams decide whether it’s worth it for their product, then adopt it one module at a time, starting where sharing pays off first.',
      problems: [
        'Every feature is built twice, once in Kotlin and once in Swift, and the two drift apart.',
        'Business rules behave slightly differently on Android and iOS, and users notice.',
        'You’re weighing a full cross-platform rewrite, but don’t want to give up native UI.',
        'You’ve heard Kotlin Multiplatform is ready for production, but not how to start without stopping feature work.',
      ],
      approachTitle: 'How I’d adopt it in your app',
      approach: [
        {
          title: 'Decide what to share, and what stays native',
          body: 'Business rules, data models and storage are good candidates for shared code. Screens, platform features like the camera, and anything that has to feel native usually stay native. The right split depends on your product and team, not on the tool.',
        },
        {
          title: 'Start with the data layer',
          body: 'HelperBook keeps its records in a shared Kotlin Multiplatform module with a SQLDelight database, so the schema and queries are written once. It’s the lowest-risk place to begin: no UI changes, and the shared code is easy to test on its own.',
        },
        {
          title: 'Adopt it alongside the apps you have',
          body: 'The shared module is added to your existing Android and iOS apps. Nothing is rewritten in one go, and feature work carries on while more code moves into the module.',
        },
        {
          title: 'Make release builds safe',
          body: 'Shared code has to survive code shrinking and serialisation. HelperBook ships with R8 rules written for SQLDelight and kotlinx-serialization, so obfuscation doesn’t break the database layer or the export format.',
        },
        {
          title: 'Say so when it isn’t the right call',
          body: 'If your team works in JavaScript, or one codebase for the UI matters more than a native feel, React Native can be the better choice. I led the rewrite of two native apps into one React Native codebase at Pulse, and I’ll recommend it when it fits.',
        },
      ],
      outcomes: [
        { value: '13', label: 'years building Android and iOS apps' },
        {
          value: '3',
          label: 'approaches shipped to production: native, Kotlin Multiplatform, React Native',
        },
        { value: '6 months', label: 'to rewrite two native apps into one React Native codebase' },
      ],
      faqs: [
        {
          question: 'Is Kotlin Multiplatform ready for production?',
          answer:
            'For sharing logic and data, yes. HelperBook’s data layer runs in a shared Kotlin Multiplatform module in production on Google Play. HelperBook ships on Android today, and the shared module means an iOS app can reuse that data layer instead of rewriting it.',
        },
        {
          question: 'Kotlin Multiplatform, React Native or Flutter?',
          answer:
            'I’ve shipped native Android and iOS apps, a shared Kotlin Multiplatform module and a full React Native rewrite, and I recommend one based on your team, timeline and which parts must be native. I haven’t shipped a Flutter app, so I won’t argue for or against it from experience.',
        },
        {
          question: 'Do we have to rewrite our apps?',
          answer:
            'No. Adoption is incremental: one shared module added to the apps you already have, then more code moves into it as it proves itself.',
        },
        {
          question: 'How does an engagement start?',
          answer:
            'With a paid discovery sprint: I review both codebases, recommend what to share first, and write a plan and estimate you can use with anyone.',
        },
      ],
      related: [
        {
          label: 'HelperBook: a local-only Android app with a shared KMP data layer',
          href: '/work/helperbook',
        },
        {
          label: 'Offline-first with no server: why HelperBook is local-only',
          href: '/writing/offline-first-without-a-server',
        },
        { label: 'Pulse: from two native apps to one React Native codebase', href: '/work/pulse' },
      ],
      ctaHeading: 'Tell me about your two codebases',
    },
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
  {
    id: 'india',
    title: 'Mobile app development in India',
    summary:
      'Android, React Native and Kotlin Multiplatform apps for Indian startups and product teams, quoted and invoiced in rupees, on IST, and on-site in Delhi NCR.',
    includes: [
      'Native Android, React Native or Kotlin Multiplatform apps',
      'Quotes and invoices in rupees (INR)',
      'IST working hours, and on-site meetings in Delhi NCR',
      'Hindi localisation, as shipped in HelperBook',
      'Design that keeps India’s DPDP Act in mind',
    ],
    proof: { label: 'Pulse case study', href: '/work/pulse' },
    listed: false,
    areaServed: 'IN',
    page: {
      query: 'hire android app developer india',
      title: 'Hire an Android app developer in India',
      description:
        'Hire a senior Android and React Native app developer in India: 13 years of experience, based in Gurugram, billing in rupees. Led an app used by Rebel Foods, Travel Food Services and Battery Smart, and built HelperBook for Indian households.',
      heading: 'A senior Android and React Native developer in Gurugram, billing in rupees',
      intro:
        'I’m a mobile engineer in Gurugram with 13 years on Android and iOS. I work with Indian startups and product teams to build, rescue or take over their apps: quoted and invoiced in rupees, on IST, and on-site in Delhi NCR when it helps.',
      problems: [
        'You need someone senior who owns the app end to end, not a team you have to manage.',
        'You want quotes and invoices in rupees, and someone who works your hours.',
        'Your app handles personal data, and you want it designed with India’s DPDP Act in mind.',
        'Your users need the app in Hindi as well as English.',
      ],
      approachTitle: 'Why teams in India work with me',
      approach: [
        {
          title: 'Built for Indian users',
          body: 'HelperBook is built for Indian households: Hindi localisation, salary statements in both English and Hindi, and wage data that never leaves the phone.',
        },
        {
          title: 'Proven with Indian brands',
          body: 'The Pulse inspection app I led was used by Indian companies including Rebel Foods, Travel Food Services and Battery Smart, alongside global clients such as Accor and Tim Hortons.',
        },
        {
          title: 'Rupees, IST and Delhi NCR',
          body: 'Quotes and invoices in INR, working hours on IST, and on-site meetings in Delhi NCR when a whiteboard beats a call.',
        },
        {
          title: 'Built for the phones your users carry',
          body: 'At Retail Quotient I tuned enterprise Android apps for low memory and fast cold start, and kept chart-heavy dashboards responsive on the low-end devices field teams actually carried.',
        },
        {
          title: 'DPDP-aware by design',
          body: 'Keeping HelperBook’s wage data on the device keeps it outside data-fiduciary scope under the DPDP Act, and its crash reports carry no names or amounts.',
        },
      ],
      outcomes: [
        { value: '13', label: 'years building Android and iOS apps' },
        { value: '100+', label: 'B2B clients, including Indian brands, on an app I led' },
        { value: '10,000+', label: 'daily active users on enterprise Android apps I built' },
        { value: '₹60,000', label: 'fixed-price discovery sprint to start' },
      ],
      faqs: [
        {
          question: 'Do you bill in rupees?',
          answer:
            'Yes. Indian clients are quoted and invoiced in rupees. Projects start with a paid discovery sprint: a fixed ₹60,000 for about a week, ending in a written plan and estimate.',
        },
        {
          question: 'Can we meet in person?',
          answer:
            'Yes, in Delhi NCR. I’m based in Gurugram and work on IST. Elsewhere in India we work remotely, with calls whenever they help.',
        },
        {
          question: 'Android, React Native or both platforms?',
          answer:
            'Whatever your users need first. I’ve shipped native Android and iOS apps, a shared Kotlin Multiplatform data layer and a React Native app, so the choice follows your product rather than what I know.',
        },
        {
          question: 'Are you a freelancer or an agency?',
          answer:
            'An independent engineer: you work with me directly, from the first call to the release.',
        },
      ],
      related: [
        { label: 'MVP app development for startups', href: '/services/mvp' },
        { label: 'Offline-first mobile app development', href: '/services/offline-first' },
        { label: 'HelperBook: built for Indian households', href: '/work/helperbook' },
        {
          label: 'Pulse: offline-first inspections for 100+ enterprise clients',
          href: '/work/pulse',
        },
      ],
      ctaHeading: 'Tell me about your app and your timeline',
    },
  },
];

/** Services offered as such: cards on /services and the home page, contact-form options, catalog JSON-LD. */
export const listedServices = services.filter((service) => service.listed !== false);

/** The hub's pointer to the India page, which isn't a card. */
export const indiaLink = {
  text: 'Working with a team in India?',
  label: 'Rupees, IST and Delhi NCR',
  href: '/services/india',
};

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
    body: 'A fixed fee of ₹60,000 (US$900) for about a week: audit or product scoping, ending in a plan and estimate.',
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
    answer: codeOwnership,
  },
  {
    question: 'Is there anything you don’t take on?',
    answer:
      'Games, and crypto or gambling products. Everything else with a mobile app at its core is worth a conversation.',
  },
  {
    question: 'How do we start?',
    answer:
      'Usually with a paid discovery sprint. It gives you a written plan and estimate, and gives us both a low-risk way to see if we work well together.',
  },
];
