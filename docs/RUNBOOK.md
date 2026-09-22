# Runbook

Commands run from the project folder. Add `--env staging` for staging; production bindings arrive in M4.
Secrets are only ever typed into a `wrangler … secret put` prompt or `.dev.vars` (git-ignored), never
pasted into chat, issues or commits.

## Is lead capture healthy?

```bash
curl -s https://abhishekgoyal-me-staging.abhigoel23.workers.dev/api/health
```

That only proves the Worker and D1 are up. The daily cron does the deep checks (Google token + Sheet read,
Telegram) and alerts by email and Telegram. To see where every lead stands:

```bash
pnpm exec wrangler d1 execute DB --env staging --remote --command \
  "SELECT ref_kind, step, status, count(*) FROM outbox_status GROUP BY 1, 2, 3"
```

Steps still `failed` or `pending` after the next 03:30 UTC run have an alert with the reason.

## An alert arrived

| Alert                                         | Likely cause → fix                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Health check failed · sheets: … 403/404`     | The Sheet was unshared or deleted, or `SHEET_ID` is wrong → reshare with the service account as Editor     |
| `Health check failed · sheets: invalid_grant` | The service-account key was revoked or rotated → [rotate the Google key](#rotate-a-secret)                 |
| `Health check failed · telegram: 401`         | Bot token revoked → new token from @BotFather, then rotate `TELEGRAM_BOT_TOKEN`                            |
| `… moved to the dead-letter queue`            | A step failed 5 times in a row. The lead is safe in D1; fix the cause and the next cron re-syncs it        |
| `Delivery still failing after re-sync`        | Read `last_error` (query below), fix, and the next daily run re-syncs it ([details](#re-run-delivery-now)) |
| `Sheet retention cleanup failed`              | Usually the same as a Sheets health failure                                                                |

```bash
pnpm exec wrangler d1 execute DB --env staging --remote --command \
  "SELECT ref_kind, ref_id, step, attempts, last_error FROM outbox_status WHERE status = 'failed'"
```

A broken **Resend** key has no health check (a sending-only key can't read anything): it shows up as failed
`notify` steps, and the alert still reaches Telegram.

## Re-run delivery now

The cron re-syncs anything pending or failed for over an hour, once a day at 03:30 UTC. There is no
manual trigger for a deployed cron. To check a fix sooner, run the same code locally against a staging
build: `CLOUDFLARE_ENV=staging pnpm build`, then `pnpm exec wrangler dev --test-scheduled`, then open
`http://localhost:8787/cdn-cgi/handler/scheduled`. That uses the local D1, so it proves the fix, not the
remote rows. Those follow at the next daily run.

## Rotate a secret

1. Create the new value at the provider (Resend API Keys, @BotFather `/revoke`, Cal.com webhook, GA4
   Measurement Protocol secrets, or a new Google service-account JSON key).
2. Store it:

   ```bash
   pnpm exec wrangler versions secret put NAME --env staging
   ```

   For the Google key, pipe it in without it touching the screen:

   ```bash
   node -e 'process.stdout.write(require(process.argv[1]).private_key)' ~/path/to/key.json \
     | pnpm exec wrangler versions secret put GOOGLE_SA_KEY --env staging
   ```

3. `versions secret put` creates a new version but doesn't deploy it. The next PR deploys it to staging,
   or deploy now with `pnpm exec wrangler versions deploy <version-id>@100% --env staging`.
4. Revoke the old value at the provider, and update `.dev.vars` if you use it locally.

Creating a new Google key needs the "Disable service account key creation" org policy set to _Not enforced_
on the `abhishekgoyal-me` project (IAM & Admin → Organization Policies). Set it back to _Inherit_ afterwards.

| Secret               | Where it comes from                                           |
| -------------------- | ------------------------------------------------------------- |
| `TURNSTILE_SECRET`   | Cloudflare → Turnstile (staging uses the public test secret)  |
| `GOOGLE_SA_KEY`      | GCP → IAM → Service accounts → `leads-writer` → Keys          |
| `RESEND_API_KEY`     | resend.com → API Keys (sending access, abhishekgoyal.me only) |
| `TELEGRAM_BOT_TOKEN` | @BotFather                                                    |
| `TELEGRAM_CHAT_ID`   | `getUpdates` after messaging the bot                          |
| `CAL_WEBHOOK_SECRET` | `openssl rand -hex 32`, also pasted into the Cal.com webhook  |
| `GA_MP_API_SECRET`   | GA4 → Admin → Data streams → Measurement Protocol API secrets |

## Someone asks to delete their data

Deletion requests arrive as a "DELETE" reply or an email. Within 30 days (the privacy page promises it):

```bash
pnpm exec wrangler d1 execute DB --env staging --remote --command \
  "DELETE FROM outbox_status WHERE ref_kind = 'lead' AND ref_id IN (SELECT lead_id FROM leads WHERE email = 'person@example.com');
   DELETE FROM leads WHERE email = 'person@example.com';
   DELETE FROM outbox_status WHERE ref_kind = 'booking' AND substr(ref_id, 1, instr(ref_id, ':') - 1) IN (SELECT booking_id FROM bookings WHERE email = 'person@example.com');
   DELETE FROM bookings WHERE email = 'person@example.com'"
```

Then delete their rows in the Sheet (Leads and Bookings tabs, filter by email), and the emails in the
`contact@` inbox. Reply to confirm it's done.

## Roll back a deploy

Production deploys roll back automatically when the smoke test fails. To roll back by hand:

```bash
pnpm exec wrangler rollback --message "why"
```

Add `--env staging` for staging. A rollback doesn't undo D1 migrations; write a new migration instead.
That's why deploy-production applies migrations before deploying, and why migrations only add things
(ADR 003): the version you roll back to must still work on the new schema.

**Rollback drill:** Actions → CI/CD → Run workflow on `main` with _drill_rollback_ ticked. It deploys,
runs the smoke test, then fails on purpose, so the rollback step runs. Check that `wrangler deployments
list` shows the rollback, and that the site still serves.

**Restore D1 data** (a bad migration or a mistaken delete). D1 Time Travel keeps 30 days:

```bash
pnpm exec wrangler d1 time-travel info DB --timestamp "2026-09-22T10:00:00Z"
pnpm exec wrangler d1 time-travel restore DB --timestamp "2026-09-22T10:00:00Z"
```

A restore replaces the whole database, including leads that arrived after that time. Export them first
(`wrangler d1 export DB --remote --output leads.sql`) and re-run delivery for them afterwards.

## Add a form field end to end

1. `src/data/lead.ts`: options and labels, if it's a choice. `src/lib/lead.ts`: add it to the schema with a
   max length, then unit tests in `src/lib/lead.test.ts`.
2. `migrations/000N_<name>.sql`: `ALTER TABLE leads ADD COLUMN …`. Apply locally, then to staging
   (`pnpm exec wrangler d1 migrations apply DB --env staging --local|--remote`). CI applies migrations to
   staging on every PR.
3. `src/lib/server/leadStore.ts`: add it to `COLUMNS`.
4. `src/lib/server/sheets.ts`: add a `LEAD_COLUMNS` entry. **Append new columns at the end**, and add the
   header to the live Sheet by hand, since headers are only written to an empty tab.
5. `src/components/react/LeadForm.tsx`: the input, and send it in the payload.
6. Decide whether it's personal data. If it is, keep it out of Telegram and GA, and update
   `src/pages/privacy.mdx` in the same PR.
7. Extend `tests/lead/lead.spec.ts`, then run `pnpm test`, `pnpm test:lead` and `pnpm check`.
