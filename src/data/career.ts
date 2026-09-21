// Career history, newest first. Mirrors the Experience section of resume/resume.html; keep them in sync.
export const career = [
  {
    role: 'Founder & Lead Engineer',
    company: 'HelperBook',
    period: 'Feb 2026 – present',
    location: 'Gurugram',
    about:
      'A local-only Android app for Indian households to track staff attendance, advances and salary. Product, architecture, UI, Hindi localisation and store submission.',
    href: '/work/helperbook',
  },
  {
    role: 'Contract Android Engineer',
    company: 'Video-first hiring platform (under NDA)',
    period: 'Jul 2025 – Jan 2026',
    location: 'Remote',
    about:
      'Built 100% of the Android client from concept to production release: 30+ screens, CameraX capture, Media3 playback and on-device speech transcription.',
    href: '/work/video-hiring',
  },
  {
    role: 'Head of Mobility / Lead Mobile Engineer',
    company: 'Aim North Technologies (Pulse Business Solutions)',
    period: 'Jan 2021 – May 2025',
    location: 'Noida',
    about:
      'Owned the Pulse inspection platform’s Android and iOS apps, from early prototype to 100+ B2B clients on an offline-first sync engine, then led the 2025 React Native rewrite.',
    href: '/work/pulse',
  },
  {
    role: 'Senior Software Engineer',
    company: 'Retail Quotient Research',
    period: 'May 2018 – Jan 2021',
    location: 'Mumbai',
    about:
      'Enterprise Android apps serving 10,000+ daily active users, tuned for low memory and fast cold start, across 8 major product cycles with founders, PMs and designers.',
  },
  {
    role: 'Software Engineer',
    company: 'Startup Techies / LSA Software / INID Digimedia',
    period: 'Apr 2013 – Apr 2018',
    location: 'Noida',
    about:
      'Where it started: an offline-first tablet app for doctors with bidirectional sync, voice-activated safety tracking with socket-based group chat, and a social food-sharing app with a custom multi-touch canvas.',
  },
] as const;

export const education = 'Bachelor of Computer Applications (BCA), Amity University';
