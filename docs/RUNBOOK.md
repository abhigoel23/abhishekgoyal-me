# Runbook

Commands run from the project folder. Add `--env staging` for staging; production bindings arrive in M4.
Secrets are only ever typed into a `wrangler … secret put` prompt or `.dev.vars` (git-ignored), never
pasted into chat, issues or commits.

## Is lead capture healthy?

```bash
curl -s https://abhishekgoyal.me/api/health          # production
curl -s https://abhishekgoyal-me-staging.abhigoel23.workers.dev/api/health   # staging
```

That only proves the Worker and D1 are up. The daily cron does the deep checks (Google token + Sheet read,
Telegram) and alerts by email and Telegram. To see where every lead stands:

```bash
pnpm exec wrangler d1 execute DB --remote --command \
  "SELECT ref_kind, step, status, count(*) FROM outbox_status GROUP BY 1, 2, 3"
```

Add `--env staging` for staging. A `skipped` step is not a failure: it was left out on purpose, and
`last_error` says why:

| `last_error`           | Step                                          | Meaning                                                                 |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `rate_limited_24h`     | `autoreply`                                   | This address already got an auto-reply in the last 24 hours (the limit) |
| `reserved_email`       | `autoreply`, subscriber emails, `audience`    | A test address such as `@example.com`, which is never emailed           |
| `no_email`             | `autoreply`                                   | The record has no email address                                         |
| `no_analytics_consent` | `ga` (leads and subscribers)                  | The visitor didn't accept analytics, so there is no GA client id        |
| `not_pending`          | `confirm_email`                               | The subscriber confirmed or unsubscribed before the email went out      |
| `not_confirmed`        | `sheets`, `audience`, `checklist_email`, `ga` | The subscriber unsubscribed before these ran                            |
| `not_unsubscribed`     | `sheet_status`                                | They signed up again before the Sheet was marked Unsubscribed           |

```bash
pnpm exec wrangler d1 execute DB --remote --command \
  "SELECT step, last_error, count(*) FROM outbox_status WHERE status = 'skipped' GROUP BY 1, 2"
```

Steps still `failed` or `pending` after the next 03:30 UTC run have an alert with the reason.

## An alert arrived

| Alert                                         | Likely cause → fix                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Health check failed · sheets: … 403/404`     | The Sheet was unshared or deleted, or `SHEET_ID` is wrong → reshare with the service account as Editor                  |
| `Health check failed · sheets: invalid_grant` | The service-account key was revoked or rotated → [rotate the Google key](#rotate-a-secret)                              |
| `Health check failed · telegram: 401`         | Bot token revoked → new token from @BotFather, then rotate `TELEGRAM_BOT_TOKEN`                                         |
| `… moved to the dead-letter queue`            | A step failed 5 times in a row. The lead is safe in D1; fix the cause and the next cron re-syncs it                     |
| `Delivery still failing after re-sync`        | Read `last_error` (query below), fix, and the next daily run re-syncs it ([details](#re-run-delivery-now))              |
| `Sheet retention cleanup failed`              | Usually the same as a Sheets health failure                                                                             |
| `Deleting unsubscribed subscribers failed`    | The Sheet or a Resend contact delete failed. Nothing was deleted from D1 for those, so the next run retries             |
| `Recording YYYY-MM in the Monthly tab failed` | See [The Monthly row is missing](#the-monthly-row-is-missing). The cron retries daily through the 7th                   |
| `Health check failed · resend_contacts: …`    | `RESEND_CONTACTS_KEY` revoked or not full access, or the segment was deleted → rotate the key / fix `RESEND_SEGMENT_ID` |

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

## The Monthly row is missing

The cron writes last month's row to the Leads Sheet's **Monthly** tab on the 1st (`src/lib/server/monthly.ts`,
[GROWTH.md](./GROWTH.md#the-monthly-tab)) and retries daily through the 7th. Workers Logs show one
`monthly` line per run: `YYYY-MM recorded`, `already recorded`, `outside window`, `not configured` or
`failed`.

- **`Unable to parse range: Monthly!…`**: the tab doesn't exist, or was renamed. Create a tab named exactly
  `Monthly`; the next run writes the header and the row.
- **Any Sheets error**: as for the other Sheets alerts above.
- **To test the cron for a given date** against the test Sheet: `CLOUDFLARE_ENV=staging pnpm build`, start the
  `worker-scheduled` config in `.claude/launch.json` (`wrangler dev --test-scheduled`), then open
  `http://localhost:8787/cdn-cgi/handler/scheduled?cron=30+3+*+*+*&time=<ms since epoch>`. `time` becomes
  the cron's `scheduledTime`, e.g. `1790825400000` = 1 Oct 2026, 03:30 UTC.
- **After the 7th**: the cron no longer tries. Fill the row by hand from the counts:

```bash
pnpm exec wrangler d1 execute DB --remote --command \
  "SELECT path, COUNT(*) FROM leads WHERE created_at >= '2026-10-01' AND created_at < '2026-11-01'
   AND COALESCE(ga_debug, '') <> '1' AND COALESCE(ga_internal, '') <> '1' GROUP BY path"
```

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

   Production is the same without `--env staging`. Use `versions secret put` there too after a rollback:
   plain `wrangler secret put` refuses while the latest uploaded version isn't the deployed one.

3. `versions secret put` creates a new version but doesn't deploy it. The next PR deploys it to staging,
   or deploy now with `pnpm exec wrangler versions deploy <version-id>@100% --env staging`.
4. Revoke the old value at the provider, and update `.dev.vars` if you use it locally.

Creating a new Google key needs the "Disable service account key creation" org policy set to _Not enforced_
on the `abhishekgoyal-me` project (IAM & Admin → Organization Policies). Set it back to _Inherit_ afterwards.

| Secret                  | Where it comes from                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `TURNSTILE_SECRET`      | Cloudflare → Turnstile (staging uses the public test secret)                                       |
| `GOOGLE_SA_KEY`         | GCP → IAM → Service accounts → `leads-writer` (staging) or `leads-writer-prod` (production) → Keys |
| `RESEND_API_KEY`        | resend.com → API Keys (sending access, abhishekgoyal.me only)                                      |
| `TELEGRAM_BOT_TOKEN`    | @BotFather                                                                                         |
| `TELEGRAM_CHAT_ID`      | `getUpdates` after messaging the bot                                                               |
| `CAL_WEBHOOK_SECRET`    | `openssl rand -hex 32`, also pasted into the Cal.com webhook                                       |
| `GA_MP_API_SECRET`      | GA4 → Admin → Data streams → Measurement Protocol API secrets                                      |
| `RESEND_CONTACTS_KEY`   | resend.com → API Keys, **full access** (managing contacts needs it; one key per environment)       |
| `RESEND_WEBHOOK_SECRET` | resend.com → Webhooks → the environment's endpoint → Signing secret (`whsec_…`)                    |

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
`contact@` inbox. If they are also a subscriber, remove them everywhere as below. Reply to confirm it's
done.

## Newsletter subscribers

**Someone replies UNSUBSCRIBE.** Resend → Audience → Contacts → find the address → set it to
**Unsubscribed**. The webhook marks D1 and the Sheet, and the address is deleted everywhere 30 days later.
Reply to confirm.

**Remove a subscriber everywhere now** (a deletion request):

1. Resend → Audience → Contacts → the address → **Delete contact**. The `contact.deleted` webhook marks
   the row unsubscribed.
2. Delete the D1 row:

   ```bash
   pnpm exec wrangler d1 execute DB --remote --command \
     "DELETE FROM outbox_status WHERE ref_kind = 'subscriber' AND ref_id IN (SELECT subscriber_id FROM subscribers WHERE email = 'person@example.com');
      DELETE FROM subscribers WHERE email = 'person@example.com'"
   ```

3. Delete their row(s) in the Sheet's Subscribers tab (filter by email).

**Re-send a confirmation.** A visitor who signs up again more than 24 hours after the last email gets a
new link on their own. Within 24 hours the form changes nothing, on purpose. To send one sooner, mark
the step pending; the next daily run issues a fresh token and emails it (the old link stops working):

```bash
pnpm exec wrangler d1 execute DB --remote --command \
  "UPDATE outbox_status SET status = 'pending', last_error = NULL WHERE ref_kind = 'subscriber' AND step = 'confirm_email'
     AND ref_id = (SELECT subscriber_id FROM subscribers WHERE email = 'person@example.com' AND status = 'pending')"
```

**Where does a subscriber stand?**

```bash
pnpm exec wrangler d1 execute DB --remote --command \
  "SELECT s.status, s.source, s.confirmed_at, s.unsubscribed_at, o.step, o.status AS step_status, o.last_error
   FROM subscribers s LEFT JOIN outbox_status o ON o.ref_kind = 'subscriber' AND o.ref_id = s.subscriber_id
   WHERE s.email = 'person@example.com'"
```

**The Resend webhook is failing.** Symptoms: people unsubscribe in Resend but D1 and the Sheet still say
subscribed. Resend → Webhooks → the endpoint → recent deliveries:

- **401**: the signing secret doesn't match. Copy it from that page and store it with
  `wrangler versions secret put RESEND_WEBHOOK_SECRET` (see [Rotate a secret](#rotate-a-secret)).
- **503**: the Worker is missing `RESEND_WEBHOOK_SECRET` or a binding; same fix.
- **5xx otherwise**: D1 was unavailable; Resend retries on its own.
- **No deliveries**: the endpoint URL or its events are wrong: it must be `…/api/resend-webhook` with
  `contact.updated` and `contact.deleted`.

Deliveries that failed can be re-sent from that page once fixed. Nothing is ever emailed to an
unsubscribed contact meanwhile: Resend itself enforces the unsubscribe.

**Sending a note.** Resend → Broadcasts, to the environment's segment. Keep Resend's unsubscribe link in
the footer (`{{{RESEND_UNSUBSCRIBE_URL}}}`): the privacy page promises one in every note.

## Roll back a deploy

Production deploys roll back automatically when the smoke test fails. To roll back by hand:

```bash
pnpm exec wrangler rollback --message "why"
```

Add `--env staging` for staging. A rollback doesn't undo D1 migrations; write a new migration instead.
That's why deploy-production applies migrations before deploying, and why migrations only add things
(ADR 003): the version you roll back to must still work on the new schema. Widening a rule counts:
`0003_subscribers.sql` rebuilds `outbox_status` so it also accepts `subscriber` rows, and older code,
which only writes `lead` and `booking`, still works on it.

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

## Test a live lead, then clear it

Submit through `https://abhishekgoyal.me/?debug=1&internal=1` so the visit is tagged as internal traffic
and the conversion goes to GA4 DebugView. Check delivery, then remove the rows:

```bash
pnpm exec wrangler d1 execute DB --remote --command \
  "SELECT lead_id, created_at, email FROM leads ORDER BY created_at DESC LIMIT 5"
pnpm exec wrangler d1 execute DB --remote --command \
  "DELETE FROM outbox_status WHERE ref_id = '<lead id>'"
pnpm exec wrangler d1 execute DB --remote --command "DELETE FROM leads WHERE lead_id = '<lead id>'"
```

Delete the matching row in the Sheet by hand: the service account can append but not edit rows.
