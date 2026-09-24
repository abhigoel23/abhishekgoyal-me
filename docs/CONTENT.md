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

| Field          | Required?                           | What it does                                                                     | Example                                                        |
| -------------- | ----------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `title`        | Yes                                 | Page `<h1>`, card heading, meta title, OG image headline                         | `'Offline-first with no server: why HelperBook is local-only'` |
| `description`  | Yes                                 | Meta description, card summary, JSON-LD description                              | `'HelperBook has no signup and no backend...'`                 |
| `pubDate`      | Yes                                 | Sort order (newest first) and the date shown on the page/RSS                     | `2026-09-24`                                                   |
| `updatedDate`  | No                                  | Shows "Updated <date>" next to the pubDate; used as `dateModified`               | `2026-10-01`                                                   |
| `tags`         | No — defaults to `[]`               | Shown as tags under the title and in RSS `categories`                            | `[offline-first, kotlin-multiplatform, privacy, android]`      |
| `draft`        | No — defaults to `false`            | `true` hides the post from production builds (still visible in `pnpm dev`)       | `true`                                                         |
| `heroImage`    | No                                  | Hero image shown under the title; optimised by Astro                             | `../../assets/writing/<slug>/hero.png`                         |
| `heroAlt`      | Required only if `heroImage` is set | Alt text for the hero image (the build fails without it when `heroImage` is set) | `'Two phones showing the sync status screen'`                  |
| `canonicalUrl` | No                                  | Set only when the post first ran elsewhere; see Cross-posting below              | `https://dev.to/...`                                           |

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

- **Ownership stated exactly as the resume does.** For Pulse: "I owned mobile for Pulse, Android and iOS,
  from an early prototype to 100+ B2B enterprise clients," matching `career.ts`'s "Architected the mobile
  engine from early prototype to **100+ B2B enterprise clients**."
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
  under `src/assets/work/<slug>/`), and `screensNote` (text shown under the screenshots, e.g. why data is
  blurred).
- **Services**: copy lives in `src/data/services.ts` (`services`, `process`, `engagements`, `faqs`).
- **Page titles/descriptions**: `src/data/pages.ts`, one entry per static route. Adding a new static page
  needs an entry here or the SEO e2e test fails.
- **Navigation**: `src/data/nav.ts`. Every entry must resolve to a real route — `tests/e2e/nav.spec.ts`
  checks this.
- **Profile/positioning**: `src/data/profile.ts` — name, headline, positioning, stats, pillars. Every fact
  here must match the resume.
- **Resume**: `src/data/career.ts` (job history) and `src/data/resume.ts`. The resume PDF is generated by
  `pnpm build` from `/resume` and must stay one page, or the build fails.

## Troubleshooting

| Problem                                               | Cause / fix                                                                                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails with "bad indentation of a mapping entry" | A YAML value (usually `title` or `description`) has an unquoted colon. Wrap it in quotes.                                                                        |
| A draft doesn't show on the live site                 | By design — `draft: true` posts are excluded once the site is built for production (`src/lib/posts.ts`). They still show in `pnpm dev`.                          |
| A published post is missing from the home page        | The home page only shows the 3 newest posts by `pubDate` (`src/pages/index.astro`). It's still on `/writing` and in the RSS feed.                                |
| Lighthouse or the axe e2e test fails on a post        | Usually a colour-contrast issue (check any inline styling you added) or a missing/empty `alt` on an image — `heroAlt` and every inline image need real alt text. |
