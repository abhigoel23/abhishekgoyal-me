// Single source of truth for who Abhishek is. Feeds pages, JSON-LD and (from M2) the /resume page.
// Every fact here must match resume/resume.html. No invented metrics.
export const profile = {
  name: 'Abhishek Goyal',
  url: 'https://abhishekgoyal.me',
  email: 'contact@abhishekgoyal.me',
  jobTitle: 'Founding Mobile Engineer',
  headline:
    'Founding Mobile Engineer — Android / Kotlin / Compose / KMP · Native iOS · 0-to-1 Specialist',
  positioning: 'I build mobile products from zero to shipped. Often as the only engineer.',
  intro:
    'Mobile engineer with 13 years on Android and iOS, usually as the only mobile engineer on the product. Most recently I designed and built HelperBook, a fully offline household-payroll app, and took it to Play Store closed beta on my own.',
  location: { city: 'Gurugram', country: 'India' },
  pillars: ['0-to-1', 'Offline-first', 'Privacy by design', 'Ships solo'],
  stats: [
    { value: '13', label: 'years building mobile apps' },
    { value: '100+', label: 'B2B clients on an offline-first engine I architected' },
    { value: '4', label: 'greenfield Android builds as the sole engineer' },
  ],
  knowsAbout: [
    'Android',
    'Kotlin',
    'Jetpack Compose',
    'Kotlin Multiplatform',
    'SQLDelight',
    'Swift',
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
