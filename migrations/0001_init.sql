-- Lead capture (ADR 003): D1 is the source of truth; Sheets, email and Telegram are delivered from it.
-- Timestamps are ISO 8601 UTC strings. Rows older than 18 months are purged by the daily cron.
-- `subscribers` arrives with the newsletter in M5.

CREATE TABLE leads (
  lead_id         TEXT PRIMARY KEY,                       -- random UUID
  created_at      TEXT NOT NULL,
  path            TEXT NOT NULL CHECK (path IN ('project', 'role')),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,                          -- lowercased
  company         TEXT,
  -- project path
  service         TEXT,
  currency        TEXT CHECK (currency IN ('USD', 'INR')),
  budget          TEXT,
  timeline        TEXT,
  -- role path
  role_title      TEXT,
  work_mode       TEXT,
  job_url         TEXT,
  message         TEXT,
  -- attribution
  source_page     TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  referrer        TEXT,
  ga_client_id    TEXT,
  consent_at      TEXT NOT NULL,                          -- when the visitor ticked the consent box
  idempotency_key TEXT NOT NULL UNIQUE                    -- hash(email + path + 10-minute window)
);

CREATE INDEX leads_created_at ON leads (created_at);        -- retention purge
CREATE INDEX leads_email_created_at ON leads (email, created_at); -- 1 auto-reply per address per 24 h

CREATE TABLE bookings (
  booking_id  TEXT PRIMARY KEY,                           -- Cal.com booking uid
  created_at  TEXT NOT NULL,
  status      TEXT NOT NULL,                              -- created | rescheduled | cancelled
  start_time  TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX bookings_created_at ON bookings (created_at);

-- One row per delivery step per lead/booking, so a retry never repeats a completed step.
CREATE TABLE outbox_status (
  ref_kind    TEXT NOT NULL CHECK (ref_kind IN ('lead', 'booking')),
  ref_id      TEXT NOT NULL,
  step        TEXT NOT NULL,                              -- sheets | notify | autoreply | telegram | ga
  status      TEXT NOT NULL CHECK (status IN ('pending', 'done', 'failed', 'skipped')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (ref_kind, ref_id, step)
);

CREATE INDEX outbox_status_status ON outbox_status (status, updated_at); -- cron re-sync
