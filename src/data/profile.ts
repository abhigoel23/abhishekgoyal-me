// Single source of truth for who Abhishek is. Feeds pages, JSON-LD and (from M2) the /resume page.
// Every fact here must match resume/resume.html. No invented metrics.
export const profile = {
  name: 'Abhishek Goyal',
  url: 'https://abhishekgoyal.me',
  email: 'contact@abhishekgoyal.me',
  jobTitle: 'Hands-on Mobile Architect',
  headline:
    'Hands-on Mobile Architect — Android / Kotlin / Compose / KMP · Native iOS · React Native · 0-to-1 Specialist',
  positioning: 'I build mobile products from zero to shipped, and own every step in between.',
  intro:
    'Mobile engineer with 13 years on Android and iOS, owning products end to end. Most recently I designed and built HelperBook, a fully offline household-payroll app, and shipped it on Google Play.',
  location: { city: 'Gurugram', country: 'India' },
  pillars: ['0-to-1', 'Offline-first', 'Privacy by design', 'End-to-end ownership'],
  stats: [
    { value: '13', label: 'years building mobile apps' },
    { value: '100+', label: 'B2B clients on an offline-first engine I architected' },
    { value: '20,000+', label: 'field users in 10+ countries on an app I led' },
  ],
  knowsAbout: [
    'Android',
    'Kotlin',
    'Jetpack Compose',
    'Kotlin Multiplatform',
    'SQLDelight',
    'Swift',
    'React Native',
    'SwiftUI',
    'Offline-first sync',
    'DPDP-aware design',
  ],
  links: {
    github: 'https://github.com/abhigoel23',
    linkedin: 'https://www.linkedin.com/in/abhishek-goyal-16848216',
    helperbook: 'https://play.google.com/store/apps/details?id=com.helperbook',
  },
} as const;

export type Profile = typeof profile;
