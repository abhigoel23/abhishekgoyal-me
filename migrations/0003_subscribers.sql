-- Newsletter subscribers with double opt-in (#109). Nothing leaves D1 until the address is confirmed.
CREATE TABLE subscribers (
  subscriber_id      TEXT PRIMARY KEY,                    -- random UUID
  email              TEXT NOT NULL UNIQUE,                -- lowercased
  status             TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  source             TEXT NOT NULL,                       -- checklist | footer | lead_form
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  consent_at         TEXT NOT NULL,                       -- when the visitor ticked the consent box
  confirm_token_hash TEXT UNIQUE,                         -- SHA-256 of the emailed token; NULL once used
  token_expires_at   TEXT,
  confirmed_at       TEXT,
  unsubscribed_at    TEXT,
  -- attribution, as on leads
  source_page        TEXT,
  utm_source         TEXT,
  utm_medium         TEXT,
  utm_campaign       TEXT,
  referrer           TEXT,
  ga_client_id       TEXT,
  ga_session_id      TEXT,
  ga_debug           TEXT,
  ga_internal        TEXT
);

CREATE INDEX subscribers_status_created_at ON subscribers (status, created_at); -- pending purge

-- Let outbox_status track subscribers. SQLite can't alter a CHECK in place, so the table is rebuilt
-- with the rule widened. Old code only writes 'lead' and 'booking', which the new rule still allows,
-- so a rollback stays safe (ADR 003).
CREATE TABLE outbox_status_new (
  ref_kind    TEXT NOT NULL CHECK (ref_kind IN ('lead', 'booking', 'subscriber')),
  ref_id      TEXT NOT NULL,
  step        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending', 'done', 'failed', 'skipped')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (ref_kind, ref_id, step)
);

INSERT INTO outbox_status_new (ref_kind, ref_id, step, status, attempts, last_error, updated_at)
  SELECT ref_kind, ref_id, step, status, attempts, last_error, updated_at FROM outbox_status;

DROP TABLE outbox_status;
ALTER TABLE outbox_status_new RENAME TO outbox_status;

CREATE INDEX outbox_status_status ON outbox_status (status, updated_at); -- cron re-sync
