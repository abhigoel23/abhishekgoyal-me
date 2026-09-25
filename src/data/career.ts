// Career history, newest first. The single source for /resume, its PDF and the About timeline.
// `highlights` use **bold** for emphasis (rendered by src/lib/richText.ts). Keep every fact true.
export type Job = {
  role: string;
  company: string;
  period: string;
  location: string;
  /** Extra detail after the location on the resume, e.g. an NDA note. */
  note?: string;
  /** One-line summary for the About page. */
  about: string;
  /** Line under the job title on the resume. */
  subtitle?: string;
  highlights: string[];
  href?: string;
};

export const career: Job[] = [
  {
    role: 'Founder & Lead Engineer',
    company: 'HelperBook',
    period: 'Feb 2026 – Present',
    location: 'Gurugram',
    about:
      'A local-only Android app for Indian households to track staff attendance, advances and salary. Product, architecture, UI, Hindi localisation and store submission.',
    subtitle:
      'Local-only Android app for Indian households to track staff attendance, advances, and salary settlements. Owned product, architecture, UI, Hindi localisation, and store submission.',
    highlights: [
      '**No signup, no server:** records live on-device via SQLDelight in a shared KMP module, with user-owned export/restore. Keeping wage data off any server keeps the app outside data-fiduciary scope under DPDP, and gives households a reason to enter real numbers.',
      '**Product rules in the data model:** unmarked days default to present so a worker is never underpaid; half-days deduct exactly half; settlement statements are generated bilingually (English/Hindi) so employer and helper can both read every line.',
      '**Release engineering:** signed AAB with R8 rules for SQLDelight and kotlinx-serialization, Crashlytics with no names or amounts in logs, Data Safety declarations, staged-rollout plan. Live on Google Play; Compose, min SDK 24, target API 35.',
    ],
    href: '/work/helperbook',
  },
  {
    role: 'Contract Android Engineer',
    company: 'Video-first hiring platform',
    period: 'Jul 2025 – Jan 2026',
    location: 'Remote',
    note: 'client under NDA',
    about:
      'Built 100% of the Android client from concept to production release: 30+ screens, CameraX capture, Media3 playback and on-device speech transcription.',
    highlights: [
      'Built 100% of the Android client from concept to production release: 30+ screens across candidate and recruiter flows on a modular Compose + MVVM + Hilt + Flow codebase the app still runs on.',
      'Candidate video responses end to end: lifecycle-safe CameraX capture, upload, and Media3 / ExoPlayer playback for recruiter screening feeds; on-device speech transcription with offline caching.',
    ],
    href: '/work/video-hiring',
  },
  {
    role: 'Head of Mobility / Lead Mobile Engineer',
    company: 'Aim North Technologies (Pulse Business Solutions)',
    period: 'Jan 2021 – May 2025',
    location: 'Noida',
    about:
      'Owned the Pulse inspection platform’s Android and iOS apps, from early prototype to 100+ B2B clients and 20,000+ field users in 10+ countries, led a team of 4–6 mobile engineers, then led the 2025 React Native rewrite.',
    subtitle:
      'Owned mobile for the Pulse enterprise inspection platform: Android and iOS end to end.',
    highlights: [
      'Architected the mobile engine from early prototype to **100+ B2B clients** and **20,000+ field users in 10+ countries** (Accor, Tim Hortons, Rebel Foods, Leica); designed the sync contract with the backend and web teams, then built both native clients against it.',
      'Engineered the offline-first data layer (dynamic form builder, background media upload queue, local SQLite cache) for auditors without connectivity, handling inspections of 500+ questions and 1,000+ photos; no data-loss incidents reported in 4.5 years of field use.',
      'Shipped the Swift/UIKit iOS client to the App Store alongside Android with feature parity; the Android app is rated **4.7★ from 3,300+ reviews**.',
      'Led **4–6 mobile engineers**: interviewed candidates, set the review and sprint process, and introduced GitHub Actions + Fastlane releases (bi-weekly cadence, same-day hotfixes).',
      '2025: led a full rewrite of both native apps into one **React Native** codebase, architected and co-built with the team in six months; now in production.',
    ],
    href: '/work/pulse',
  },
  {
    role: 'Senior Software Engineer',
    company: 'Retail Quotient Research',
    period: 'May 2018 – Jan 2021',
    location: 'Mumbai',
    about:
      'Enterprise Android retail and FMCG audit apps for field reps, serving 10,000+ daily active users, tuned for low memory and fast cold start, across 8 major product cycles with founders, PMs and designers.',
    highlights: [
      'Enterprise Android retail/FMCG audit apps for field reps, serving **10,000+ daily active users**, tuned for low memory and fast cold start; shipped 8 major product cycles with founders, PMs, and designers, and guided junior developers.',
      'Owned chart-heavy reporting dashboards rendering large result sets, kept responsive on the low-end devices field teams actually carried.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Startup Techies / LSA Software / INID Digimedia',
    period: 'Apr 2013 – Apr 2018',
    location: 'Noida',
    about:
      'Where it started: an offline-first tablet app for doctors with bidirectional sync, voice-activated safety tracking with socket-based group chat, and a social food-sharing app with a custom multi-touch canvas.',
    highlights: [
      '**EzHealth Track:** offline-first tablet app for doctors with bidirectional sync. **SafeON / iCouch:** voice-activated safety tracking and socket-based group chat. **Eatlo:** social food-sharing app with custom multi-touch canvas and Google Maps.',
    ],
  },
];

export const education = {
  degree: 'Bachelor of Computer Applications (BCA)',
  school: 'Amity University',
};
