-- #80: join the server-side generate_lead to the visitor's GA session, and carry the debug and
-- internal-traffic flags. Additive only, so the previous Worker version still runs on this schema.
ALTER TABLE leads ADD COLUMN ga_session_id TEXT;
ALTER TABLE leads ADD COLUMN ga_debug TEXT;
ALTER TABLE leads ADD COLUMN ga_internal TEXT;
