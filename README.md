# abhishekgoyal.me

Source for [abhishekgoyal.me](https://abhishekgoyal.me): the personal site of Abhishek Goyal, a mobile engineer who builds Android/KMP products from zero to shipped.

**Stack:** Astro 7 · React islands · Tailwind CSS 4 · Cloudflare Workers (static assets + edge API) · GitHub Actions.

## Getting started

Requires Node 26+ and pnpm 12 (`brew install node pnpm`).

```sh
pnpm install
pnpm dev          # http://localhost:4321
```

| Script          | What it does                                       |
| --------------- | -------------------------------------------------- |
| `pnpm build`    | Build static pages + Worker into `dist/`           |
| `pnpm preview`  | Serve the built Worker locally with `wrangler dev` |
| `pnpm check`    | ESLint + Prettier + `astro check`                  |
| `pnpm test`     | Unit tests (Vitest)                                |
| `pnpm test:e2e` | Playwright smoke tests (desktop + mobile)          |

## Environments

| Env        | Where                          | Notes                                |
| ---------- | ------------------------------ | ------------------------------------ |
| local      | `pnpm dev` / `pnpm preview`    | Secrets in `.dev.vars` (see example) |
| preview    | Worker preview URL, one per PR | Posted as a PR comment, `noindex`    |
| production | abhishekgoyal.me               | Deployed on merge to `main`          |

## Deploy and roll back

Merging to `main` builds and deploys through GitHub Actions (`.github/workflows/ci.yml`), applying D1 migrations first and rolling back automatically if the production smoke test fails. To roll back by hand, run `pnpm exec wrangler rollback` or use Cloudflare dashboard → Workers → abhishekgoyal-me → Deployments.

## Docs

- [Architecture](docs/ARCHITECTURE.md): how a lead travels from the form to the Sheet, inbox and phone
- [Runbook](docs/RUNBOOK.md): health checks, alerts, rotating secrets, deletion requests, rollbacks
- [Analytics](docs/ANALYTICS.md): what is tracked, the consent model, and how to check it
- [DNS](docs/DNS.md): the zone, the launch cutover and email records
- [Architecture decisions](docs/decisions/)
- `CLAUDE.md`: conventions for AI-assisted work in this repo
