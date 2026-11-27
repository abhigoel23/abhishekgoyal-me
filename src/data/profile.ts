// Single source of truth for who Abhishek is. Feeds pages, JSON-LD and (from M2) the /resume page.
// Every fact here must match resume/resume.html. No invented metrics.
export const profile = {
  name: 'Abhishek Goyal',
  url: 'https://abhishekgoyal.me',
  email: 'contact@abhishekgoyal.me',
  jobTitle: 'Hands-on Mobile Architect',
  headline:
    'Hands-on Mobile Architect — Android / Kotlin / Compose / KMP · Native iOS · React Native · 0-to-1 Specialist',
  positioning:
    'Mobile architecture for apps that must work in the field, from first commit to 50,000+ users.',
  intro:
    '13 years on Android and iOS. As founding engineer, then Head of Mobility, I architected the offline-first Pulse platform and grew it to 100+ B2B clients in 10+ countries, leading 4–6 mobile engineers. Since then I have built a video-first hiring platform’s Android client end to end.',
  location: { city: 'Gurugram', country: 'India' },
  pillars: [
    'Former Head of Mobility',
    'Offline-first architecture',
    'Android & iOS',
    'India · US · EU',
  ],
  // Plain-text trust signals (no numbers, no logos), shown in the hero and the footer. Confirmed by
  // Abhishek on 2026-11-27.
  credentials: ['GST registered', 'D-U-N-S® verified', 'Organizational Play Store publisher'],
  stats: [
    { value: '13', label: 'years building mobile apps' },
    { value: '100+', label: 'B2B clients on an offline-first engine I architected' },
    { value: '50,000+', label: 'users in 10+ countries on an app I led' },
  ],
  knowsAbout: [
    'Android',
    'Kotlin Multiplatform',
    'iOS',
    'React Native',
    'Offline-first architecture',
    'Kotlin',
    'Jetpack Compose',
    'SQLDelight',
    'Swift',
    'SwiftUI',
    'DPDP-aware design',
  ],
  links: {
    github: 'https://github.com/abhigoel23',
    linkedin: 'https://www.linkedin.com/in/abhishek-goyal-16848216',
    helperbook: 'https://play.google.com/store/apps/details?id=com.helperbook',
  },
} as const;

export type Profile = typeof profile;
