# abhishekgoyal.me

Personal-brand site for Abhishek Goyal (mobile engineer), with lead capture. Astro 7 + React islands,
deployed as one Cloudflare Worker (static assets + `/api/*`). Roadmap: GitHub Milestones M0–M6.

## Commands (pnpm 12, Node 26; Homebrew binaries: prefix shells with `eval "$(/opt/homebrew/bin/brew shellenv)"`)

| Task                  | Command                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Dev server            | `pnpm dev`                                                                                             |
| Build                 | `pnpm build`                                                                                           |
| Run built Worker      | `pnpm preview` (`wrangler dev`, :8787 by default)                                                      |
| Lint + format + types | `pnpm check`                                                                                           |
| Unit tests            | `pnpm test` (Vitest, `src/**/*.test.ts`)                                                               |
| E2E smoke             | `pnpm test:e2e` (Playwright; `BASE_URL=` to target a deployed URL)                                     |
| E2E lead flow         | `pnpm test:lead` (staging build + throwaway local D1; never a deployed URL)                            |
| Lighthouse gate       | `pnpm lighthouse` (after `pnpm build`)                                                                 |
| Private resume PDF    | `RESUME_PHONE="+91 …" pnpm resume` (after `pnpm build`)                                                |
| Favicons              | `pnpm icons`                                                                                           |
| Cross-post links      | `pnpm share <slug>` (prints LinkedIn + dev.to links; see docs/CONTENT.md)                              |
| Newsletter note       | `pnpm digest [last note date]` → `newsletter/<date>.html`; send: `gh workflow run send-newsletter.yml` |

pnpm 12 has no `-s` flag; use `--silent`.

## File map

- `astro.config.mjs` — integrations; `session: false`; `imageService: 'compile'`
- `wrangler.jsonc` — Worker config; `env.staging` has the lead bindings and serves PR previews (ADR 006). Build
  for it with `CLOUDFLARE_ENV=staging pnpm build`; `pnpm cf:types` regenerates the git-ignored `Env` types
- `src/worker.ts` — Worker entry: Astro `fetch`, plus the lead `queue` consumer and daily `scheduled` cron
- `src/pages/` — routes, prerendered by default; `src/pages/api/*` opt out with `prerender = false`
- `src/lib/theme.ts` — design tokens (Studio, ADR 005); `/styleguide` shows them. Components use semantic
  utilities only (`bg-surface`, `text-muted`, `rounded-brand`), never raw colours
- `src/data/career.ts` + `resume.ts` — resume source; `pnpm build` prints `/resume` to `resume.pdf` (1 page or fail)
- `src/lib/` — shared TS; `src/lib/server/` is server-only (M3). `src/lib/lead.ts` is the lead zod schema
  (client + server); form options live in `src/data/lead.ts`
- `migrations/` — D1 schema. Apply: `pnpm exec wrangler d1 migrations apply DB --env staging --local|--remote`
- `src/components/react/` — React islands only (forms, embeds)
- `tests/e2e/` — Playwright smoke (safe on any URL); `tests/lead/` — lead flow, local only; unit tests
  live next to source as `*.test.ts`
- `docs/` — ARCHITECTURE, RUNBOOK, CONTENT, TOPICS, GROWTH, ANALYTICS, DNS, `decisions/` (ADRs)

## Conventions

- Branch `feat|fix|chore/<slug>`; every PR closes an Issue; CI must be green to merge to `main`.
- Default to `.astro` components; use React only when a component needs client-side state.
- Content and copy live in data files (`src/data/profile.ts`, MDX), never hardcoded in components.
- Every claim on the site must match the resume; no invented metrics.
- Secrets only in `.dev.vars` (git-ignored) or Worker/GitHub secrets. Never commit or print them.

## Don't

- Don't read `dist/`, `.astro/`, `node_modules/`, `.wrangler/`, or the lockfile (denied in `.claude/settings.json`).
- Don't bump TypeScript to 7 or ESLint to 10 yet: typescript-eslint, `@astrojs/check`, and the React/a11y ESLint plugins don't support them.
- Don't use Astro's `getViteConfig` for Vitest: it boots workerd and breaks unit tests.

## Agents (`.claude/agents/`)

Route work to the cheapest agent that can do it verifiably: `scout`, `ci-triage`, `fixer` (Haiku) ·
`content-drafter`, `builder`, `test-writer` (Sonnet). Security-sensitive code (`src/pages/api/*`,
`src/lib/server/*`, migrations) and reviewing agent diffs stay with the main session.
