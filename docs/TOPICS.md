# Topics

The backlog of blog topics, top of the list first. Every topic names the source lines it relies on, quoted
from `src/data/career.ts`, `src/data/resume.ts`, `src/data/services.ts` or a case study in
`src/content/work/`. No source, no topic. A post may claim only what its sources say. Anything more has to
come from Abhishek first, and goes into the case study or resume before it goes into a post.

## Rules

The [writing rules in CONTENT.md](./CONTENT.md#writing-rules) apply to every post. Also:

- No "solo", "sole engineer" or "one-person" wording. Use the resume's own words: "built 100% of the
  Android client", "Founder & lead engineer", "architected and co-built with the team".
- Past tense for Pulse (left May 2025) and the video-hiring app (contract ended Jan 2026).
- The video-hiring client stays anonymous ("a video-first hiring platform"): no name, logo or screens.
- HelperBook screenshots are published only in their blurred versions.
- A service post (topics 5 and 9) describes the offer. It doesn't invent past engagements or client results.

## Backlog

| #   | Topic (working title)                                                              | Angle, and who it's for                                                                                       | Source (file: quoted phrase)                                                                                                                                             | Needs from Abhishek                                                       | Status |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------ |
| 1   | Two native apps into one React Native codebase in six months                       | CTOs weighing a native-to-cross-platform rewrite: how Pulse's rewrite was led and shared with the team        | `career.ts`: "led a full rewrite of both native apps into one **React Native** codebase, architected and co-built with the team in six months"                           | What was carried over, what was split, and what you'd do differently      | idea   |
| 2   | Releases that stopped being events                                                 | Teams still building releases by hand: moving Pulse to GitHub Actions + Fastlane                              | `career.ts`: "Introduced GitHub Actions + Fastlane releases: bi-weekly cadence and same-day hotfixes, replacing manual builds"                                           | What the pipeline did, step by step                                       | idea   |
| 3   | Fast on the phones field teams actually carry                                      | Android devs whose users are on low-end devices: memory, cold start and chart-heavy screens (Retail Quotient) | `career.ts`: "tuned for low memory and fast cold start"; "kept responsive on the low-end devices field teams actually carried"                                           | The techniques used (no new numbers unless they go into the resume first) | idea   |
| 4   | Shipping iOS alongside Android with feature parity                                 | Teams adding a second platform: keeping two native Pulse clients in parity for non-technical users            | `career.ts`: "Wrote and shipped the Swift/iOS client to the App Store alongside Android with feature parity"; "usable by non-technical staff with no training"           | How parity was kept (shared contract, reviews, tests)                     | idea   |
| 5   | Native, Kotlin Multiplatform or React Native: how I'd choose                       | Founders picking a stack: the choice depends on the product and team                                          | `services.ts`: "chosen for your product and team rather than my preference"; `resume.ts`: "React Native (led a full rewrite of two native apps)"                         | Your decision criteria                                                    | idea   |
| 6   | 30+ screens from concept to release, on an architecture that outlived the contract | Teams scoping a greenfield Android app: the modular Compose setup on the video-hiring app                     | `career.ts`: "Built 100% of the Android client from concept to production release: 30+ screens"; "a modular Compose + MVVM + Hilt + Flow codebase the app still runs on" | How modules were split, without anything that identifies the client       | idea   |
| 7   | Lifecycle-safe video capture, from CameraX to Media3                               | Android devs adding video capture and playback                                                                | `career.ts`: "lifecycle-safe CameraX capture, upload, and Media3 / ExoPlayer playback"                                                                                   | Which lifecycle pitfalls you handled and can describe without the client  | idea   |
| 8   | Speech transcription on the device, with offline caching                           | Teams that need transcription without a network or a cloud service                                            | `career.ts`: "on-device speech transcription with offline caching"; `resume.ts`: "native speech recognition"                                                             | The API used and why it ran on-device                                     | idea   |
| 9   | What a paid discovery sprint gives you                                             | Prospective clients unsure what they get before a build                                                       | `services.ts`: "A short, paid sprint to understand the product, the code (if any) and the constraints. You get a written plan and estimate you can use with anyone."     | A sample outline of the written plan (no real client)                     | idea   |
| 10  | Offline-first in three products, from a doctors' tablet app to HelperBook          | A look back at offline-first across three products                                                            | `career.ts`: "offline-first tablet app for doctors with bidirectional sync"; "offline-first sync engine"; "records live on-device via SQLDelight"                        | What EzHealth Track taught you that carried over                          | idea   |
| 11  | Crash reporting with no personal data in it                                        | Apps handling wages, health or other sensitive data (HelperBook)                                              | `career.ts`: "Crashlytics with no names or amounts in logs"; `resume.ts`: "PII-free crash reporting"                                                                     | How logs are scrubbed. Post 1 mentions this, so the post needs more depth | idea   |
| 12  | What goes in HelperBook's shared Kotlin Multiplatform module                       | Small teams considering KMP                                                                                   | `career.ts`: "records live on-device via SQLDelight in a shared KMP module"                                                                                              | What's shared beyond storage. Post 1 covers the basics                    | idea   |
| 13  | Product rules in the data model, not the UI                                        | Payroll and attendance apps, where a UI bug can underpay someone                                              | `career.ts`: "unmarked days default to present so a worker is never underpaid; half-days deduct exactly half"                                                            | New detail (tests, edge cases). Post 1 already covers these rules         | idea   |
| 14  | The day our upload queue got stuck                                                 | Teams with background uploads: a real Pulse media-queue failure, how it was found and fixed                   | `pulse.mdx`: "When the upload queue got stuck" (one failed photo blocked the queue; per-photo failed status, retry on submit, then ask the user)                         | How the failure surfaced, and how long it took to find                    | idea   |
| 15  | Offline-first should be the default for business apps                              | Founders and leads scoping field or B2B apps                                                                  | `career.ts`: "offline-first data layer … for auditors working without connectivity"; "records live on-device via SQLDelight"                                             | Your argument, and when it's the wrong call                               | idea   |
| 16  | Share the logic, keep the UI native: why I reach for KMP first                     | Teams choosing between KMP and full cross-platform                                                            | `career.ts`: "records live on-device via SQLDelight in a shared KMP module"; "led a full rewrite … into one **React Native** codebase"                                   | Your criteria; say KMP is in production on Android only                   | idea   |
| 17  | Agree the contract before writing the client                                       | Mobile and backend teams starting a sync or API project                                                       | `career.ts`: "designed the sync contract (payloads, upload semantics, failure behaviour) with the backend and web teams"                                                 | What the contract document contained                                      | idea   |

## Published

| Post                                                          | URL                                       | Covers                                            |
| ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Offline-first with no server: why HelperBook is local-only    | `/writing/offline-first-without-a-server` | HelperBook: local-only, data-model rules, release |
| Offline-first with a server: lessons from Pulse's sync engine | `/writing/offline-first-sync-lessons`     | Pulse: the sync contract, ID remapping, conflicts |

## How to use

1. Take the top `idea`. Before drafting, get the "Needs from Abhishek" detail and add anything new to the
   resume or case study first, so the post's claims stay traceable.
2. Open an Issue from the **Post** template (`.github/ISSUE_TEMPLATE/post.yml`) and set the row's status to
   `planned`.
3. In the post's PR, set the status to `published (/writing/<slug>)` and move the row to Published. If the
   post is dropped, set it to `skipped (reason)`.
