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

Merging to `main` builds and deploys through GitHub Actions (`.github/workflows/deploy.yml`). To roll back, run `pnpm wrangler rollback` or use Cloudflare dashboard → Workers → abhishekgoyal-me → Deployments.

## Docs

- [Architecture decisions](docs/decisions/)
- `CLAUDE.md`: conventions for AI-assisted work in this repo
