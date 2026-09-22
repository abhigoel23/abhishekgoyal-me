// Writes a lead and its pending delivery steps to D1 in one transaction (ADR 003).
import type { Lead } from '../lead';

// Delivery steps run by the queue consumer; each gets an outbox row so retries never repeat one.
export const LEAD_STEPS = ['sheets', 'notify', 'autoreply', 'telegram', 'ga'] as const;

// Same email + path within one 10-minute window counts as one lead (double clicks, retries).
export async function idempotencyKey(lead: Pick<Lead, 'email' | 'path'>, now: Date) {
  const window = Math.floor(now.getTime() / 600_000);
  const bytes = new TextEncoder().encode(`${lead.email}|${lead.path}|${window}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type SaveResult = { leadId: string; duplicate: boolean };

const COLUMNS = [
  'lead_id',
  'created_at',
  'path',
  'name',
  'email',
  'company',
  'service',
  'currency',
  'budget',
  'timeline',
  'role_title',
  'work_mode',
  'job_url',
  'message',
  'source_page',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'referrer',
  'ga_client_id',
  'consent_at',
  'idempotency_key',
] as const;

export async function saveLead(db: D1Database, lead: Lead, now: Date): Promise<SaveResult> {
  const key = await idempotencyKey(lead, now);
  const leadId = crypto.randomUUID();
  const at = now.toISOString();
  const fields: Record<string, unknown> = { ...lead };
  const row: Record<(typeof COLUMNS)[number], unknown> = Object.fromEntries(
    COLUMNS.map((c) => [c, fields[c] ?? null]),
  ) as Record<(typeof COLUMNS)[number], unknown>;
  Object.assign(row, { lead_id: leadId, created_at: at, consent_at: at, idempotency_key: key });

  const insertLead = db
    .prepare(
      `INSERT INTO leads (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})
       ON CONFLICT (idempotency_key) DO NOTHING`,
    )
    .bind(...COLUMNS.map((c) => row[c]));
  // Selecting from leads means a duplicate (no new row) creates no outbox rows either.
  const insertSteps = LEAD_STEPS.map((step) =>
    db
      .prepare(
        `INSERT INTO outbox_status (ref_kind, ref_id, step, status, updated_at)
         SELECT 'lead', lead_id, ?, 'pending', ? FROM leads WHERE lead_id = ?`,
      )
      .bind(step, at, leadId),
  );
  const [result] = await db.batch([insertLead, ...insertSteps]);
  if (result.meta.changes === 1) return { leadId, duplicate: false };

  const existing = await db
    .prepare('SELECT lead_id FROM leads WHERE idempotency_key = ?')
    .bind(key)
    .first<{ lead_id: string }>();
  return { leadId: existing?.lead_id ?? leadId, duplicate: true };
}
