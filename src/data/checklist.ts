// Content for the offline-first Android launch checklist lead magnet and its /checklist landing page.

// Where the built PDF is served from (scripts/checklist-pdf.mjs writes here after `astro build`).
export const checklistPdf = '/checklist/offline-first-android-launch-checklist.pdf';

export const checklist = {
  title: 'Offline-first Android launch checklist',
  subtitle:
    'A practical checklist for a founder, lead or engineer to run through before launching an Android app that has to work without a connection.',
  version: 'v1 · September 2026',
  intro: [
    "I've spent years building offline-first Android apps: some that eventually talk to a server, like Pulse, and one, HelperBook, that never does. This is what I actually check before I call a build ready to ship.",
    "None of it is theoretical. Where an item comes from a real decision in one of those two apps, the note under it says so; the rest are the checks I'd want on any launch.",
  ],
  sections: [
    {
      title: 'Data model and local storage',
      items: [
        {
          text: 'Treat the local database as the source of truth, not a cache for a server that might not be reachable.',
        },
        {
          text: 'Choose SQLite, or SQLDelight if you want it shared across platforms, before reaching for a heavier abstraction.',
          why: "HelperBook's records live on-device via SQLDelight, inside a shared Kotlin Multiplatform module.",
        },
        {
          text: 'Decide the default for every missing or ambiguous value before launch, not after the first support message.',
          why: 'HelperBook defaults an unmarked attendance day to present, so a worker is never underpaid because someone forgot to tap.',
        },
        {
          text: 'Make partial values exact rather than approximate, especially anywhere money or time is involved.',
          why: "HelperBook's half-days deduct exactly half, with no rounding surprises at month end.",
        },
        {
          text: 'Write your database migrations before you write the feature that needs them, and test them against real data.',
        },
        {
          text: 'Keep the schema small enough that one person can explain every table from memory.',
        },
        {
          text: 'Generate any statement or record a user shares with someone else in every language both sides read.',
          why: 'HelperBook generates settlement statements bilingually, in English and Hindi, so the employer and the helper can both read every line without trusting a translation.',
        },
      ],
    },
    {
      title: 'Identity and sync',
      items: [
        {
          text: 'Ask whether you need a server at all before you design a sync engine for one.',
          why: 'HelperBook has no signup and no server. Going local-only removed the sync contract, conflict resolution and retry queue that a server-backed app like Pulse needed.',
        },
        {
          text: "Give every record a local ID the moment it's created, before the server has ever heard of it.",
          why: 'At Pulse, an auditor could start an inspection with no signal, so the form got a temporary local ID first and was remapped to a server ID once it synced.',
        },
        {
          text: 'Repoint every piece of local state referencing a temporary ID once the server assigns a real one: answers, attachments, queue entries.',
          why: "At Pulse, once the server ID arrived, the form's answers and media were remapped to it.",
        },
        {
          text: 'Make retries reuse the ID a record already has rather than requesting a new one.',
          why: 'At Pulse, a retry reused the server ID the record already had, which is how the server knew it was the same inspection.',
        },
        {
          text: 'Design the sync contract, payloads, upload semantics and failure behaviour, with your backend and web teams before either client is built.',
          why: 'At Pulse, I designed the sync contract with the backend and web teams, then implemented both native clients against it.',
        },
        {
          text: 'Carry the two ID spaces, local and server, explicitly in your types rather than letting them blur into one.',
        },
      ],
    },
    {
      title: 'Media and uploads',
      items: [
        {
          text: 'Build a background upload queue for anything too large to send inline with the form.',
          why: "Pulse's offline-first data layer included a background media upload queue.",
        },
        {
          text: 'Decide upload order as a correctness question, not a speed one.',
          why: 'At Pulse, photos went up before the form, so the server never held an inspection with missing photos.',
        },
        {
          text: 'Gate the final submission on every attachment being confirmed uploaded, if getting the order wrong would leave the server holding incomplete data.',
          why: 'At Pulse, the form was only submitted once every photo attached to it was confirmed on the server.',
        },
        {
          text: "Don't delete local data until the server has confirmed it received it.",
        },
        {
          text: 'Let uploads keep running in the background while the user carries on working, rather than blocking them on a spinner.',
        },
        {
          text: 'Log every upload failure somewhere your team will actually see it.',
          why: 'At Pulse, logging and monitoring on the upload pipeline meant a stuck or failing upload showed up in the logs rather than disappearing.',
        },
      ],
    },
    {
      title: 'Conflicts and user trust',
      items: [
        {
          text: 'Design your data model so two people editing the same record at once is the uncommon case, not the default one.',
          why: "At Pulse, the app was built so that most of the time two people weren't editing the same inspection record at once.",
        },
        {
          text: 'If you use last-write-wins, decide that on purpose in a design review, rather than letting it become the default by accident.',
        },
        {
          text: 'When a conflict is detected, warn the user and let them keep their local version instead of silently overwriting it.',
          why: 'At Pulse, when a conflict was detected the user saw a warning and could choose to keep their local version instead of the one that had just landed.',
        },
        {
          text: 'Show sync status after submission, not just a loading state before it.',
          why: "Pulse auditors weren't sure their work had reached the server after submitting; showing upload progress and a count of items left to go up fixed that.",
        },
        {
          text: 'Never let "submitted" and "synced" collapse into a single state in your interface.',
          why: "That gap is exactly what left Pulse's auditors unsure whether their work had reached the server; once users can't tell the two states apart, they stop trusting the app with their data.",
        },
        {
          text: 'Pick a conflict strategy you can explain in one sentence, and make sure the person whose work might get overwritten gets a say.',
          why: 'Pulse used last-write-wins as a default, but only alongside the warning that let the person who did the work keep it.',
        },
      ],
    },
    {
      title: 'Privacy and data safety',
      items: [
        {
          text: 'Ask whether sensitive data needs to reach a server at all, especially where people might hesitate to enter it truthfully otherwise.',
          why: 'HelperBook keeps wage data off any server entirely, because a household might hesitate to enter real numbers if it thought those numbers were going somewhere.',
        },
        {
          text: 'Check what keeping data on-device means for your regulatory scope in your market, in plain terms specific to that data.',
          why: "Keeping wage data off any server keeps HelperBook outside data-fiduciary scope under India's DPDP Act.",
        },
        {
          text: "Give users export and restore if there's no account for them to recover their data from.",
          why: 'HelperBook users own their data through export and restore.',
        },
        {
          text: 'Keep names and amounts out of your crash reports.',
          why: 'HelperBook wires in Crashlytics, but the logs carry no names or amounts.',
        },
        {
          text: 'Make your Play Data Safety declaration describe what the app actually does, not a template answer.',
          why: "HelperBook's Play Data Safety declarations describe what the app actually does.",
        },
        {
          text: 'Decide before launch what counts as sensitive for your app, and keep it out of logs, backups and third-party SDKs alike.',
        },
      ],
    },
    {
      title: 'Release engineering',
      items: [
        {
          text: 'Ship a signed AAB for every release once you are past internal testing.',
        },
        {
          text: 'Write R8 keep rules for your database and serialisation libraries before you obfuscate a release build.',
          why: "HelperBook ships as a signed AAB with R8 rules written for SQLDelight and kotlinx-serialization, so obfuscation doesn't break the database layer or the serialised export format.",
        },
        {
          text: "Roll out in stages so a bad release doesn't reach everyone at once.",
          why: 'HelperBook has a staged-rollout plan.',
        },
        {
          text: 'Automate your release pipeline with CI rather than building and signing by hand.',
          why: 'At Pulse, GitHub Actions and Fastlane replaced manual builds with a predictable bi-weekly release cadence and same-day hotfixes.',
        },
        {
          text: 'Test on your real minimum SDK on a real device, not only on your target SDK in an emulator.',
          why: "HelperBook's min SDK is 24 and its target API is 35.",
        },
        {
          text: 'Monitor upload and sync failures in production logs, not just crashes.',
          why: 'At Pulse, monitoring the upload pipeline meant failures were visible rather than silent.',
        },
        {
          text: 'Decide your release cadence up front, weekly, bi-weekly or milestone-based, and stick to it.',
        },
      ],
    },
  ],
  closing:
    "If you're weighing whether your app needs a server at all, or you're deep into a sync engine and something feels fragile, I'm happy to talk it through. I take on projects like this, from an MVP build to rescuing an app that's already in the field. Reach me via /contact.",
} as const;

// Copy for the /checklist landing page.
export const checklistPage = {
  eyebrow: 'Free checklist',
  title: 'Offline-first Android launch checklist',
  lead: 'A practical list to run through before you ship an Android app that has to work without a connection.',
  whoFor: [
    'Founders shipping their first offline-first Android app',
    'Engineering leads deciding whether their product needs a server at all',
    'Android engineers building or reviewing a sync engine',
  ],
  inside: [
    'Getting the local data model and its defaults right before launch',
    'Giving records an identity before the server has one, and syncing them safely',
    'Ordering uploads so the server never holds incomplete data',
    "Designing conflicts away, and telling users when they can't be",
    'Keeping sensitive data safe and your Play Store declarations honest',
    "Release engineering: R8 rules, staged rollouts and CI you don't have to babysit",
  ],
  formNote:
    "I'll email you the checklist once you confirm your address, plus the occasional note on what I'm building. Unsubscribe anytime.",
  soon: 'Sign-up opens soon — check back shortly.',
} as const;
