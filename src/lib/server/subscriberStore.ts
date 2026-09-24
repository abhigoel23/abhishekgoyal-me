// Newsletter subscribers in D1 (#109). Double opt-in: a sign-up is stored as `pending` with the hash of a
// one-time token; the emailed link carries the token itself. Nothing is sent to the Sheet, Resend or GA
// until the address is confirmed (those steps arrive in #110).
import type { Subscribe } from '../subscribe';

/** Sent once per sign-up (and again on a repeat sign-up while pending). */
export const SIGNUP_STEPS = ['confirm_email'] as const;
/** Run once the address is confirmed (#110). */
export const CONFIRMED_STEPS = ['sheets', 'audience', 'checklist_email', 'ga'] as const;
/** Run after an unsubscribe arrives from Resend's webhook. */
export const UNSUBSCRIBE_STEPS = ['sheet_status'] as const;

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** At most one confirmation email per address in this window. */
export const CONFIRM_EMAIL_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** 32 random bytes, base64url: 43 characters (matches confirmTokenPattern). */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const COLUMNS = [
  'subscriber_id',
  'email',
  'status',
  'source',
  'created_at',
  'updated_at',
  'consent_at',
  'confirm_token_hash',
  'token_expires_at',
  'confirmed_at',
  'unsubscribed_at',
  'source_page',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'referrer',
  'ga_client_id',
  'ga_session_id',
  'ga_debug',
  'ga_internal',
] as const;

export type SubscriberRow = Record<(typeof COLUMNS)[number], string | null>;

export async function getSubscriber(db: D1Database, subscriberId: string) {
  return db
    .prepare('SELECT * FROM subscribers WHERE subscriber_id = ?')
    .bind(subscriberId)
    .first<SubscriberRow>();
}

const pendingSteps = (db: D1Database, steps: readonly string[], id: string, at: string) =>
  steps.map((step) =>
    db
      .prepare(
        // Upsert: a repeat sign-up re-opens the confirmation email step.
        `INSERT INTO outbox_status (ref_kind, ref_id, step, status, updated_at)
         VALUES ('subscriber', ?, ?, 'pending', ?)
         ON CONFLICT (ref_kind, ref_id, step)
           DO UPDATE SET status = 'pending', last_error = NULL, updated_at = excluded.updated_at`,
      )
      .bind(id, step, at),
  );

/**
 * What happened to a sign-up. `send` means a confirmation email should go out with `token`; the caller
 * answers the visitor the same way in every case, so nobody can tell whether an address is on the list.
 */
export type SignupResult =
  { send: true; subscriberId: string; token: string } | { send: false; subscriberId: string };

export async function saveSignup(
  db: D1Database,
  input: Subscribe,
  now: Date,
): Promise<SignupResult> {
  const at = now.toISOString();
  const token = newToken();
  const tokenHash = await hashToken(token);
  const expires = new Date(now.getTime() + TOKEN_TTL_MS).toISOString();

  const existing = await db
    .prepare('SELECT subscriber_id, status FROM subscribers WHERE email = ?')
    .bind(input.email)
    .first<{ subscriber_id: string; status: string }>();

  // Already confirmed: nothing to do, and nothing to send.
  if (existing?.status === 'confirmed')
    return { send: false, subscriberId: existing.subscriber_id };

  if (existing) {
    // A confirmation already went out in the last 24 hours: keep its link working and send nothing.
    // Otherwise anyone could re-submit an address to invalidate the link in its owner's inbox.
    const since = new Date(now.getTime() - CONFIRM_EMAIL_INTERVAL_MS).toISOString();
    const recent = await db
      .prepare(
        `SELECT 1 FROM outbox_status WHERE ref_kind = 'subscriber' AND ref_id = ?
           AND step = 'confirm_email' AND status = 'done' AND updated_at > ?`,
      )
      .bind(existing.subscriber_id, since)
      .first();
    if (recent) return { send: false, subscriberId: existing.subscriber_id };

    // Pending or unsubscribed: a fresh token (the old link stops working) and a fresh consent time.
    // Attribution keeps its first-touch values.
    await db.batch([
      db
        .prepare(
          `UPDATE subscribers SET status = 'pending', confirm_token_hash = ?, token_expires_at = ?,
             consent_at = ?, updated_at = ?, unsubscribed_at = NULL
           WHERE subscriber_id = ?`,
        )
        .bind(tokenHash, expires, at, at, existing.subscriber_id),
      ...pendingSteps(db, SIGNUP_STEPS, existing.subscriber_id, at),
    ]);
    return { send: true, subscriberId: existing.subscriber_id, token };
  }

  const subscriberId = crypto.randomUUID();
  const fields: Record<string, unknown> = { ...input };
  const row: Record<string, unknown> = Object.fromEntries(
    COLUMNS.map((c) => [c, fields[c] ?? null]),
  );
  Object.assign(row, {
    subscriber_id: subscriberId,
    status: 'pending',
    created_at: at,
    updated_at: at,
    consent_at: at,
    confirm_token_hash: tokenHash,
    token_expires_at: expires,
  });
  // Two sign-ups for the same new address can race; the UNIQUE email makes the second a no-op insert,
  // and its outbox rows are only created if this insert won.
  const [result] = await db.batch([
    db
      .prepare(
        `INSERT INTO subscribers (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})
         ON CONFLICT (email) DO NOTHING`,
      )
      .bind(...COLUMNS.map((c) => row[c])),
    ...SIGNUP_STEPS.map((step) =>
      db
        .prepare(
          `INSERT INTO outbox_status (ref_kind, ref_id, step, status, updated_at)
           SELECT 'subscriber', subscriber_id, ?, 'pending', ? FROM subscribers WHERE subscriber_id = ?`,
        )
        .bind(step, at, subscriberId),
    ),
  ]);
  if (result!.meta.changes === 1) return { send: true, subscriberId, token };
  return { send: false, subscriberId };
}

/**
 * Gives a pending subscriber a new token, for a confirmation email the cron re-sends: the raw token
 * only ever travels in the queue message, so a re-sync without it has to issue a fresh one.
 */
export async function rotateToken(db: D1Database, subscriberId: string, now: Date) {
  const token = newToken();
  const result = await db
    .prepare(
      `UPDATE subscribers SET confirm_token_hash = ?, token_expires_at = ?, updated_at = ?
       WHERE subscriber_id = ? AND status = 'pending'`,
    )
    .bind(
      await hashToken(token),
      new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
      now.toISOString(),
      subscriberId,
    )
    .run();
  return result.meta.changes === 1 ? token : null;
}

export type ConfirmResult = { ok: true; subscriberId: string } | { ok: false };

/** Confirms the pending subscriber holding this token, once. Expired, used or unknown tokens fail. */
export async function confirmToken(
  db: D1Database,
  token: string,
  now: Date,
): Promise<ConfirmResult> {
  const tokenHash = await hashToken(token);
  const at = now.toISOString();
  const row = await db
    .prepare(
      `SELECT subscriber_id FROM subscribers
       WHERE confirm_token_hash = ? AND status = 'pending' AND token_expires_at > ?`,
    )
    .bind(tokenHash, at)
    .first<{ subscriber_id: string }>();
  if (!row) return { ok: false };

  const [update] = await db.batch([
    db
      .prepare(
        // The status and hash conditions make a double submit confirm only once.
        `UPDATE subscribers SET status = 'confirmed', confirmed_at = ?, updated_at = ?,
           confirm_token_hash = NULL, token_expires_at = NULL
         WHERE subscriber_id = ? AND confirm_token_hash = ? AND status = 'pending'`,
      )
      .bind(at, at, row.subscriber_id, tokenHash),
    // A re-subscriber (unsubscribed, then confirmed again) runs these steps again.
    ...CONFIRMED_STEPS.map((step) =>
      db
        .prepare(
          `INSERT INTO outbox_status (ref_kind, ref_id, step, status, updated_at)
           SELECT 'subscriber', subscriber_id, ?, 'pending', ? FROM subscribers
           WHERE subscriber_id = ? AND status = 'confirmed' AND confirmed_at = ?
           ON CONFLICT (ref_kind, ref_id, step)
             DO UPDATE SET status = 'pending', last_error = NULL, updated_at = excluded.updated_at`,
        )
        .bind(step, at, row.subscriber_id, at),
    ),
  ]);
  return update!.meta.changes === 1 ? { ok: true, subscriberId: row.subscriber_id } : { ok: false };
}

/**
 * Marks an address unsubscribed (from Resend's webhook) and queues the Sheet update. Returns the
 * subscriber id if something changed; null for unknown addresses (e.g. another environment's contact)
 * and for addresses that were already unsubscribed.
 */
export async function markUnsubscribed(db: D1Database, email: string, now: Date) {
  const at = now.toISOString();
  const row = await db
    .prepare(`SELECT subscriber_id FROM subscribers WHERE email = ? AND status != 'unsubscribed'`)
    .bind(email.trim().toLowerCase())
    .first<{ subscriber_id: string }>();
  if (!row) return null;
  const [update] = await db.batch([
    db
      .prepare(
        `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?, updated_at = ?,
           confirm_token_hash = NULL, token_expires_at = NULL
         WHERE subscriber_id = ? AND status != 'unsubscribed'`,
      )
      .bind(at, at, row.subscriber_id),
    ...UNSUBSCRIBE_STEPS.map((step) =>
      db
        .prepare(
          `INSERT INTO outbox_status (ref_kind, ref_id, step, status, updated_at)
           VALUES ('subscriber', ?, ?, 'pending', ?)
           ON CONFLICT (ref_kind, ref_id, step)
             DO UPDATE SET status = 'pending', last_error = NULL, updated_at = excluded.updated_at`,
        )
        .bind(row.subscriber_id, step, at),
    ),
  ]);
  return update!.meta.changes === 1 ? row.subscriber_id : null;
}

/**
 * Pending sign-ups nobody confirmed are deleted this long after their last sign-up (updated_at, so a
 * re-subscriber isn't purged the day they sign up again), with their outbox rows.
 */
export const PENDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function purgeUnconfirmed(db: D1Database, now: Date) {
  const cutoff = new Date(now.getTime() - PENDING_RETENTION_MS).toISOString();
  const results = await db.batch([
    db
      .prepare(
        `DELETE FROM outbox_status WHERE ref_kind = 'subscriber' AND ref_id IN
           (SELECT subscriber_id FROM subscribers WHERE status = 'pending' AND updated_at < ?)`,
      )
      .bind(cutoff),
    db.prepare(`DELETE FROM subscribers WHERE status = 'pending' AND updated_at < ?`).bind(cutoff),
  ]);
  return results[1]!.meta.changes;
}
