# Content

How to publish a post, edit copy, or add a case study, without needing to know Astro.

## Publish a post

1. Pick the top `idea` in [`docs/TOPICS.md`](./TOPICS.md) and open an Issue from the **Post** template
   (`.github/ISSUE_TEMPLATE/post.yml`; every PR must close an Issue). The Issue carries the source quotes
   and the fact-check, ship and cross-post checklist. The target is one post every 2 weeks. To skip a
   post, close its Issue as "not planned" and give the reason.
2. Branch off `main`: `content/<slug>`, e.g. `content/offline-first-testing`.
3. Create `src/content/writing/<slug>.mdx`. The file name is the URL: `<slug>.mdx` becomes
   `/writing/<slug>`.
4. Add front matter (see the table and example below), then write the body in Markdown/MDX under the
   `---` block.
5. Preview it locally:

   ```bash
   pnpm dev
   ```

   Open `http://localhost:4321/writing/<slug>`. Drafts (`draft: true`) show up here even though they're
   excluded from production builds, so this is also how you preview a draft before it's ready.

6. Open a PR. CI runs `pnpm check`, `pnpm test`, `pnpm build`, the e2e suite and Lighthouse. A PR from
   this repository (not a fork) also deploys a preview to
   `https://pr-<PR number>-abhishekgoyal-me-staging.abhigoel23.workers.dev`, linked in a comment CI adds
   to the PR.
7. Before merging, set `pubDate` to the day you expect to merge (it drives sort order, the RSS feed and
   the date shown on the page).
8. Merge. Wait for the production deploy to finish before checking the live site — merging kicks off the
   `deploy-production` job, it isn't instant.

You don't need a local editor for small changes. Abhishek has edited posts directly on github.com: open
the `.mdx` file in the PR (or create it) using GitHub's web editor, commit to the PR's branch, and CI runs
the same checks. Useful for wording fixes after opening a PR, or for the very first draft of a short post.

## Front-matter fields

From the `writing` collection schema (`src/content.config.ts`):

| Field          | Required?                           | What it does                                                                                                                                                                                      | Example                                                        |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `title`        | Yes                                 | Page `<h1>`, card heading, meta title, OG image headline                                                                                                                                          | `'Offline-first with no server: why HelperBook is local-only'` |
| `description`  | Yes                                 | Meta description, card summary, JSON-LD description                                                                                                                                               | `'HelperBook has no signup and no backend...'`                 |
| `pubDate`      | Yes                                 | Sort order (newest first) and the date shown on the page/RSS                                                                                                                                      | `2026-09-24`                                                   |
| `updatedDate`  | No                                  | Shows "Updated <date>" next to the pubDate; used as `dateModified`                                                                                                                                | `2026-10-01`                                                   |
| `tags`         | No — defaults to `[]`               | Shown as tags under the title and in RSS `categories`                                                                                                                                             | `[offline-first, kotlin-multiplatform, privacy, android]`      |
| `draft`        | No — defaults to `false`            | `true` hides the post from production builds (still visible in `pnpm dev`)                                                                                                                        | `true`                                                         |
| `heroImage`    | No                                  | Hero image shown under the title; optimised by Astro                                                                                                                                              | `../../assets/writing/<slug>/hero.png`                         |
| `heroAlt`      | Required only if `heroImage` is set | Alt text for the hero image (the build fails without it when `heroImage` is set)                                                                                                                  | `'Two phones showing the sync status screen'`                  |
| `canonicalUrl` | No                                  | Set only when the post first ran elsewhere; see Cross-posting below                                                                                                                               | `https://dev.to/...`                                           |
| `offer`        | No                                  | The box after the post: `checklist` (the offline-first checklist) or `service:<id>` (a service page, e.g. `service:kmp`). An unknown id fails the build. Pick the one closest to the post's topic | `service:kmp`                                                  |

Copy-pasteable example:

```yaml
---
title: 'A short, punchy title'
description: 'One or two sentences, under 160 characters, for the meta description and cards.'
pubDate: 2026-10-01
tags: [android, kotlin]
---
```

Quoting rules:

- Wrap `title` and `description` in single quotes. A colon inside an unquoted YAML value breaks the
  build ("bad indentation of a mapping entry") — see the real posts, both titles contain a colon and are
  quoted.
- If the text itself contains an apostrophe, use double quotes instead (see
  `offline-first-sync-lessons.mdx`: `title: "Offline-first with a server: lessons from Pulse's sync engine"`).
- Keep `description` to 160 characters or fewer — it becomes the meta description and the card summary.
- Tags are lowercase and hyphenated, matching the real posts (`offline-first`, `kotlin-multiplatform`).
  There are no tag pages yet, so tags are display-only.

## What happens automatically

Don't do these by hand — they're generated from the front matter and body:

- **Reading time** (`src/lib/readingTime.ts`): words in the body ÷ 230wpm, rounded up, minimum 1 minute.
  Shown on the post page and the `/writing` list.
- **The `/writing` list** (`src/pages/writing/index.astro`): every published post, newest `pubDate` first.
- **Home page "Latest writing"** (`src/pages/index.astro`): the 3 newest published posts. A post older
  than the 3 most recent won't appear here — that's by design, not a bug.
- **RSS at `/rss.xml`** (`src/pages/rss.xml.ts`): full rendered post content, with root-relative links
  and images made absolute so feed readers resolve them correctly.
- **A share (OG) image** at `/og/writing/<slug>.png` (`src/pages/og/[...slug].png.ts`), rendered from the
  post's `title` at build time.
- **BlogPosting JSON-LD** (`src/lib/seo.ts`, `blogPostingJsonLd`), embedded on the post page with
  `headline`, `description`, `datePublished`, `dateModified`, `image` and `url` filled from the front
  matter.
- **Sitemap**: published posts are included automatically (`astro.config.mjs`'s `sitemap()` only excludes
  `/styleguide` and `/thanks`).
- **e2e coverage** (`tests/e2e/routes.ts`, `tests/e2e/writing.spec.ts`, `tests/e2e/a11y.spec.ts`): every
  published post (drafts are excluded by checking front matter for `draft: true`) is automatically
  checked for a working page, valid BlogPosting JSON-LD, a working OG image, and axe accessibility
  violations in both light and dark mode.

## Images

- A hero image is optional. Set `heroImage` to a relative path and `heroAlt` to its alt text — the schema
  refuses to build if `heroImage` is set without `heroAlt`.
- Store a post's images under `src/assets/writing/<slug>/` (this folder doesn't exist yet — create it
  when you need it) and reference them with a relative path from the `.mdx` file, e.g.
  `../../assets/writing/<slug>/diagram.png`.
- Inline images in the body use plain Markdown: `![Alt text](../../assets/writing/<slug>/diagram.png)`.
  Astro optimises anything under `src/assets` (resizes, converts format); it does not optimise anything
  in `public/`, so don't put post images there.
- Alt text should describe what the image shows and why it's there, the way the HelperBook case study does for
  its screenshots (e.g. "Monthly attendance calendar with present, absent and half-days marked, and a
  note that unmarked days count as present"), not just a filename or "screenshot".
- **Privacy**: never publish real client or helper data. HelperBook screenshots that ship on the site have
  names, wages and balances blurred (`src/content/work/helperbook.mdx`'s `screensNote`: "Names, wages and
  balances are blurred. These are real household records, which is the point."); the unblurred originals
  must never be committed. The video-first hiring platform client stays anonymous under NDA — no name,
  logo or screens (`src/content/work/video-hiring.mdx`: "The client is under NDA, so its name and screens
  aren't shown here").

## Code blocks

- Fence every code block with a language, e.g. ` ```kotlin `.
- Syntax highlighting uses `github-light-high-contrast` / `github-dark-high-contrast` (Shiki, configured
  in `astro.config.mjs`) specifically because they pass WCAG AA contrast in both themes — the default
  theme's comment colour doesn't.
- If a snippet isn't real production code, label it as such in a comment inside the block, the way both
  seed posts do: `// Simplified illustration of the rule, not HelperBook's actual code.` / `// Simplified
illustration, not Pulse's actual code.`

## Writing rules

Every claim on the site must match the resume (`src/data/career.ts`, `src/data/resume.ts`) and the case
studies in `src/content/work/`. No invented metrics — if a number isn't already stated somewhere in those
files, don't add it in a post.

The fact-check checklist used on the two seed posts:

- **Ownership stated exactly as the resume does.** For Pulse: founding engineer who architected the initial
  mobile app, web frontend and backend, then Head of Mobility. On mobile: "I owned mobile for Pulse, Android
  and iOS, from an early prototype to 100+ B2B enterprise clients," matching `career.ts`'s "grew the mobile
  engine to **100+ B2B clients**."
- **"Reported" stays "reported."** The claim is "no data-loss incidents were reported in 4.5 years of
  field use" — not "no data was ever lost." That distinction is in both the post and the case study.
- **Team work is credited.** "I designed the sync contract with the backend and web teams" — not "I
  designed the sync contract," which would erase the other teams.
- **Past tense for products you no longer work on.** Pulse is described in the past tense ("owned",
  "designed", "showed"): Abhishek left in May 2025, so present tense would describe a product he can't
  vouch for today. (The React Native rewrite he led shipped before he left.)
- **Plans are called plans.** Anything not yet shipped (a staged rollout, a feature not yet released) is
  described as a plan, not as something already delivered.

## Cross-posting

The site (abhishekgoyal.me) is always the original. Posts go to **LinkedIn** and **dev.to** only
(platforms and their UTM values: `src/data/share.ts`). Once the post is live and the production deploy
has finished, run:

```bash
pnpm share <slug>
```

It prints the canonical URL, a starting LinkedIn post with a UTM link and hashtags, and the dev.to
checks. It only prints; it posts nothing.

- **LinkedIn** has no canonical-URL support, so post a short summary plus the link, never the full text.
  The summary is drafted with the post, in its PR description, and fact-checked against the post in the
  same pass; `pnpm share` supplies the UTM link and hashtags.
- **dev.to** imports each new post from `https://abhishekgoyal.me/rss.xml` as a draft, with the canonical
  URL and tags already set, and adds its own "Originally published at abhishekgoyal.me" line (don't add
  another). Check the draft's front matter and preview as `pnpm share` lists, then publish. That link
  carries no UTM params, so its visits show in GA4 as dev.to referrals.
- Tick the Post issue's cross-post box when both are done.

One-time dev.to setup (done in #133): [dev.to/settings/extensions](https://dev.to/settings/extensions) →
**Publishing to DEV Community from RSS** → feed URL `https://abhishekgoyal.me/rss.xml`, **Mark the RSS
source as canonical URL by default** on, **Replace self-referential links with DEV Community-specific
links** off (links should lead back to this site) → **Save Feed Settings**.

The reverse case is rare: set `canonicalUrl` in the front matter only when a post _first ran elsewhere_.
The page's `<link rel="canonical">` then points at that other URL, while the share image and
BlogPosting JSON-LD stay pointed at this site (`src/pages/writing/[slug].astro`).

## Case studies, services and other copy

- **Case studies**: `src/content/work/<slug>.mdx`. Fields from the schema: `title`, `summary`, `role`,
  `period`, `client`, `platform`, `stack`, `order` (controls display order), `featured` (defaults to
  `true`; set `false` to keep it off the home page), `links`, `screens` (array of `{ src, alt }`, images
  under `src/assets/work/<slug>/`), `screensNote` (text shown under the screenshots, e.g. why data is
  blurred), and `demo` (optional looping screen recording, below).
- **Demo video** (`demo: { mp4, webm?, poster, alt }`): 8–12 s, no audio, under ~1.5 MB, with the same
  blurring or demo data as the screenshots. The files go in `public/media/work/<slug>/`, and `mp4` is
  the path from there, e.g. `/media/work/<slug>/demo.mp4`; `poster` is an image under `src/assets/work/<slug>/`, usually the first
  frame; `alt` describes what happens, step by step, and is shown as the caption. It downloads nothing
  until it plays, plays muted only while on screen, has a Play/Pause button, and never starts by itself
  for visitors who prefer reduced motion. To encode from a screen recording (`brew install ffmpeg`):
  `ffmpeg -i in.mov -an -vf "scale=540:-2,fps=24" -c:v libx264 -crf 30 -preset slow -movflags +faststart demo.mp4`.
- **Services**: copy lives in `src/data/services.ts` (`services`, `process`, `engagements`, `faqs`).
- **Page titles/descriptions**: `src/data/pages.ts`, one entry per static route. Adding a new static page
  needs an entry here or the SEO e2e test fails.
- **Navigation**: `src/data/nav.ts`. Every entry must resolve to a real route — `tests/e2e/nav.spec.ts`
  checks this.
- **Profile/positioning**: `src/data/profile.ts` — name, headline, positioning, stats, pillars. Every fact
  here must match the resume.
- **Resume**: `src/data/career.ts` (job history and `certifications`) and `src/data/resume.ts` (summary).
  The resume PDF is generated by `pnpm build` from `/resume` and must stay one page, or the build fails.
  CI renders slightly wider than a Mac, so keep the PDF at about 57 lines of `pdftotext -layout` output
  (the length on `main` today); if it grows, trim wording rather than dropping credit to the team. A
  career entry with `only: 'about'` shows on `/about` alone and one with `only: 'resume'` on `/resume`
  alone; that's how early career is three roles on `/about` and one combined line on the resume.
- **About page**: `aboutIntro` in `src/data/about.ts` is the LinkedIn About text plus the HelperBook origin
  story. Change both together (see [LinkedIn profile](#linkedin-profile) and [Upwork profile](#upwork-profile)).

## LinkedIn profile

The LinkedIn profile mirrors the site, and the site is the source of truth: change the data files first,
merge, then copy the wording to LinkedIn. What maps to what:

| LinkedIn                      | Site source                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Headline                      | `headline` in `src/data/profile.ts`                                                      |
| About                         | `aboutIntro` in `src/data/about.ts`, without the last (HelperBook) paragraph             |
| Experience titles and bullets | `src/data/career.ts` (the `only: 'about'` entries for the three early-career roles)      |
| Experience skills             | the matching case study's `stack`, five per role                                         |
| Top skills                    | the first five of `knowsAbout` in `src/data/profile.ts`                                  |
| Skills section                | `knowsAbout` plus the stacks in `src/content/work/`                                      |
| Featured                      | the home page and the three case studies                                                 |
| Experience media              | each role's case study (`href`); LSA: outfy.com and the OUTFY Google Play listing        |
| Projects                      | the three case studies: summary, then `Case study: https://abhishekgoyal.me/work/<slug>` |
| Licenses & certifications     | `certifications` in `src/data/career.ts`                                                 |
| Open to work                  | `setups` in `src/data/hire.ts` and the relocation work mode in `src/data/lead.ts`        |

- Company names: Retail Quotient's operations ran under the **Redquanta** brand, so Redquanta is the company and "Retail Quotient Research Private
  Limited" is named in the first bullet.
- After changing a Featured link's page, refresh LinkedIn's cached preview with the
  [Post Inspector](https://www.linkedin.com/post-inspector/).
- Numbers follow the site exactly: "50,000+ users" (the source is 50K+ Google Play downloads), never a
  rounder or newer figure that isn't in `career.ts` yet.

### LinkedIn Services page

The Services section (Open to → Providing services) is set up separately from the rest of the profile:

- **Services:** chosen from LinkedIn's fixed list, up to 10. It has no entries for MVP builds,
  offline-first, Kotlin Multiplatform or fractional lead, so the closest matches stand in for the five
  services in `src/data/services.ts`: Mobile Application Development, Android Development, iOS
  Development, Application Development, Custom Software Development and IT Consulting.
- **About (500 characters):** the five services' titles in one sentence, the stacks, the years and the
  HelperBook and Pulse proof, ending with `abhishekgoyal.me/services`. Update it when a service is added
  or renamed.
- **Work location:** Gurugram plus available to work remotely, matching `location` in `profile.ts`.
- **Pricing:** Contact for pricing. Rates are never published, here or on the site.
- **Messages:** Open Profile is on, so clients who aren't connections can message for free. Enquiries
  land in the service requests inbox, not the main messages.

## Upwork profile

The Upwork profile follows the same rule: the site is the source of truth, and Upwork gets the wording
after the change is merged. Upwork is pitched at freelance clients, not employers, so the overview is a
client-facing rewrite of the LinkedIn About ("What I've shipped", then "How I can help") and leaves out
the open-to-full-time-roles line.

| Upwork             | Site source                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Title              | a 70-character cut of `headline` in `src/data/profile.ts`                                       |
| Overview           | `aboutIntro` in `src/data/about.ts` and the case-study summaries, rewritten for clients         |
| Skills             | `knowsAbout` mapped to Upwork's skill list (it has no Kotlin Multiplatform or Jetpack Compose)  |
| Employment history | `src/data/career.ts`, the `only: 'about'` entries, one per role (seven in all)                  |
| Portfolio          | the case studies: HelperBook and Pulse (the video-hiring app has no shareable image, under NDA) |
| Certifications     | `certifications` in `src/data/career.ts`                                                        |

- Limits: title 70 characters, employment description 1,000, portfolio title 70 and description 600,
  five skills per portfolio item. Trim wording to fit; keep the team credit ("co-built with the team").
- No links to abhishekgoyal.me (Upwork restricts off-platform links). A portfolio item can link to the
  app's store listing instead, as HelperBook links to Google Play.
- A portfolio item can't be published without an uploaded thumbnail image, which has to be done by
  hand; the screenshots are in `src/assets/work/<slug>/`.
- Hourly rate and availability are Abhishek's call; don't change them when syncing copy.
- The overview's opening lines follow the resume summary in `src/data/resume.ts` (13 years, end-to-end
  ownership, founding engineer, 50,000+ users); when the summary changes, update the overview too.

## dev.to profile

The dev.to profile ([@abhishek_goyal_c97dbf2eea](https://dev.to/abhishek_goyal_c97dbf2eea), set up in
#133 for the RSS import above) follows the same rule: change the site first, then copy the wording at
[dev.to/settings/profile](https://dev.to/settings/profile).

| dev.to               | Site source                                                                             |
| -------------------- | --------------------------------------------------------------------------------------- |
| Website URL          | `https://abhishekgoyal.me/?utm_source=devto&utm_medium=social&utm_campaign=profile`     |
| Location             | `location` in `src/data/profile.ts`                                                     |
| Bio (200 characters) | `positioning` in `src/data/profile.ts`, then years, stack and HelperBook                |
| Available for        | the services in `src/data/services.ts`, then the full-time setups in `src/data/hire.ts` |
| Skills/Languages     | `knowsAbout` in `src/data/profile.ts`, in the same order                                |
| Currently hacking on | the HelperBook entry in `src/data/career.ts`                                            |
| Work, Education      | the latest role and `education` in `src/data/career.ts`                                 |

- Keep the UTM tag on the website link, so visits from the profile show as dev.to in GA4.
- The email shown on the profile is `contact@abhishekgoyal.me`, the site's public address.

## GitHub profile

GitHub has two parts, both public, and both follow the site:

- **Profile README:** the [abhigoel23/abhigoel23](https://github.com/abhigoel23/abhigoel23) repo. Its
  intro follows `aboutIntro` in `src/data/about.ts`, "What I build" follows `src/data/services.ts`,
  "Selected work" follows the case-study summaries, "Stack" follows `knowsAbout` in
  `src/data/profile.ts` (same order), and "Get in touch" carries the relocation line from
  `src/data/hire.ts`. Commit straight to its `main`; it isn't covered by this repo's PR rules.
- **Profile fields** at [github.com/settings/profile](https://github.com/settings/profile):

| GitHub             | Site source                                                         |
| ------------------ | ------------------------------------------------------------------- |
| Name               | `name` in `src/data/profile.ts`                                     |
| Bio (160 max)      | `jobTitle` and the stack from `headline`, then `positioning`        |
| Website            | `url` in `src/data/profile.ts`                                      |
| Social accounts    | `links.linkedin` in `src/data/profile.ts`, plus the dev.to profile  |
| Company, Location  | the latest role in `src/data/career.ts`; `location` in `profile.ts` |
| Available for hire | on while `/hire` is open                                            |

- The `gh` token has no `user` scope, so `gh api -X PATCH user` fails; edit the fields in the browser,
  or run `gh auth refresh -h github.com -s user` first. Keep the email hidden.

## Resume file on other platforms

After the resume changes, regenerate the private PDF (`RESUME_PHONE="+91 …" pnpm resume` after
`pnpm build`) and replace the copy saved on LinkedIn:

- **LinkedIn:** Jobs → Settings → Job application settings
  (`https://www.linkedin.com/jobs/application-settings/`). Upload
  `resume/out/Abhishek-Goyal-Resume.pdf`, then delete the older copies so Easy Apply can't send an
  outdated one. Keep exactly one saved resume. This copy has the phone number, so it goes here only,
  never in Featured; anything public uses the phone-free `/resume.pdf`.
- **Upwork:** no resume upload. Upwork's resume import only pre-fills the profile and would overwrite
  the synced fields; the profile itself carries the resume content.
- Uploads go through the file picker, which Claude's in-app browser can't drive: Abhishek uploads, Claude
  checks the list afterwards.

## Troubleshooting

| Problem                                               | Cause / fix                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails with "bad indentation of a mapping entry" | A YAML value (usually `title` or `description`) has an unquoted colon. Wrap it in quotes.                                                                                                                                                                                                                                          |
| A draft doesn't show on the live site                 | By design — `draft: true` posts are excluded once the site is built for production (`src/lib/posts.ts`). They still show in `pnpm dev`.                                                                                                                                                                                            |
| A published post is missing from the home page        | The home page only shows the 3 newest posts by `pubDate` (`src/pages/index.astro`). It's still on `/writing` and in the RSS feed.                                                                                                                                                                                                  |
| Lighthouse or the axe e2e test fails on a post        | Usually a colour-contrast issue (check any inline styling you added) or a missing/empty `alt` on an image — `heroAlt` and every inline image need real alt text.                                                                                                                                                                   |
| A new front-matter field doesn't show in `pnpm dev`   | The dev server keeps its own content store and only clears it when it sees `src/content.config.ts` change while running. With `pnpm dev` running, make any small edit to `src/content.config.ts`, save, then undo it and save again; the log shows "Content config changed → Clearing content store". `pnpm build` isn't affected. |
