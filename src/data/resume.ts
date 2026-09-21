// Resume-only content (summary and core stack). Experience comes from career.ts, identity from profile.ts.
export const resumeSummary =
  'Mobile engineer with 13 years of experience taking products from zero to shipped. Owned four greenfield Android builds end to end, most recently HelperBook, a fully offline household-payroll app I designed, built, and took to Play Store closed beta. Previously owned Android *and* App Store iOS for an enterprise inspection platform that grew to 100+ B2B clients on an offline-first sync engine I architected. Comfortable owning architecture, media pipelines, release engineering, and product calls at once.';

export const coreStack = [
  {
    label: 'Android',
    items:
      'Kotlin · Jetpack Compose · Coroutines & Flow · Kotlin Multiplatform · SQLDelight · Room · Hilt · Clean Architecture (MVVM/MVI) · Retrofit / Ktor',
  },
  { label: 'iOS', items: 'Swift · SwiftUI · shipped a production App Store client end to end' },
  {
    label: 'Cross-platform',
    items: 'React Native (led a full rewrite of two native apps) · Kotlin Multiplatform',
  },
  {
    label: 'Media & real-time',
    items: 'CameraX · Media3 / ExoPlayer · WebSockets · native speech recognition · audio capture',
  },
  {
    label: 'Data & privacy',
    items:
      'Local-first / offline-first sync · API contract design · Play Data Safety · DPDP-aware design · PII-free crash reporting',
  },
  {
    label: 'Delivery',
    items:
      'Play Console (tracks, staged rollout) · GitHub Actions · Fastlane · R8 · Cursor and Claude Code for scaffolding, tests, and refactors',
  },
];
