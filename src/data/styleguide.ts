// Sample content for the /styleguide specimens. Facts are from resume/resume.html;
// the real case studies arrive as MDX in M2.
export const sampleWork = [
  {
    eyebrow: 'Founder & sole engineer · 2026',
    title: 'HelperBook',
    summary:
      'A local-only Android app for Indian households to track staff attendance, advances and salary. No signup, no server: wage data never leaves the phone.',
    tags: ['Kotlin', 'Compose', 'KMP', 'SQLDelight'],
    href: '/work/helperbook',
  },
  {
    eyebrow: 'Head of Mobility · 2021–2025',
    title: 'Pulse offline-sync engine',
    summary:
      'The offline-first engine behind an enterprise inspection platform that grew to 100+ B2B clients. No data-loss incidents reported in 4.5 years of field use.',
    tags: ['Android', 'iOS', 'Offline-first'],
    href: '/work/pulse',
  },
  {
    eyebrow: 'Contract Android engineer · 2025',
    title: 'Video-first hiring app',
    summary:
      '100% of the Android client, concept to production: 30+ screens, CameraX capture, Media3 playback and on-device speech transcription.',
    tags: ['CameraX', 'Media3', 'Hilt'],
    href: '/work/video-hiring',
  },
] as const;

export const projectTypes = [
  'MVP build',
  'App rescue / modernisation',
  'KMP migration',
  'Fractional mobile lead',
];
