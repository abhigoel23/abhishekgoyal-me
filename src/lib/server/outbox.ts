// Runs delivery steps for a lead or a booking and records each one in outbox_status (ADR 003), so a
// retry only repeats what failed. Steps without a handler yet stay 'pending' and don't cause retries;
// the daily cron re-runs pending and failed rows once their handler exists.
// Queues deliver at least once, so a rare duplicate delivery can repeat a step; the Sheet then shows a
// duplicate row with the same ID, which is harmless and easy to spot.
import { getLead, LEAD_STEPS, type LeadRow } from './leadStore';

export type RefKind = 'lead' | 'booking';
export type LeadStep = (typeof LEAD_STEPS)[number];
/**
 * Why a step was skipped on purpose. Stored in `last_error`, so an expected skip (such as the 24-hour
 * auto-reply limit) doesn't look like a fault. docs/RUNBOOK.md explains each one.
 */
export type SkipReason =
  | 'rate_limited_24h' // this address already got the email in the last 24 hours
  | 'reserved_email' // an RFC 2606 test address such as @example.com: never emailed
  | 'no_email'
  | 'no_analytics_consent'; // no GA client id: the visitor didn't accept analytics
export type StepResult = 'done' | { skipped: SkipReason };
export const skip = (reason: SkipReason): StepResult => ({ skipped: reason });
export type Handlers<S extends string, R> = Partial<Record<S, (record: R) => Promise<StepResult>>>;
export type StepHandlers = Handlers<LeadStep, LeadRow>;

export type DeliveryResult<S extends string = string> = { found: boolean; failed: S[] };

export async function runSteps<S extends string, R>(
  db: D1Database,
  kind: RefKind,
  refId: string,
  record: R | null,
  order: readonly S[],
  handlers: Handlers<S, R>,
  now: () => Date = () => new Date(),
): Promise<DeliveryResult<S>> {
  // Purged by retention (or never saved): nothing left to deliver.
  if (!record) return { found: false, failed: [] };

  const { results } = await db
    .prepare('SELECT step, status FROM outbox_status WHERE ref_kind = ? AND ref_id = ?')
    .bind(kind, refId)
    .all<{ step: S; status: string }>();
  const open = new Set(
    results.filter((r) => r.status === 'pending' || r.status === 'failed').map((r) => r.step),
  );

  const failed: S[] = [];
  for (const step of order) {
    const handler = handlers[step];
    if (!open.has(step) || !handler) continue;
    try {
      const result = await handler(record);
      if (result === 'done') await mark(db, kind, refId, step, 'done', null, now());
      else await mark(db, kind, refId, step, 'skipped', result.skipped, now());
    } catch (error) {
      failed.push(step);
      await mark(db, kind, refId, step, 'failed', String(error).slice(0, 500), now());
    }
  }
  return { found: true, failed };
}

export async function deliverLead(
  db: D1Database,
  leadId: string,
  handlers: StepHandlers,
  now: () => Date = () => new Date(),
) {
  return runSteps(db, 'lead', leadId, await getLead(db, leadId), LEAD_STEPS, handlers, now);
}

async function mark(
  db: D1Database,
  kind: RefKind,
  refId: string,
  step: string,
  status: 'done' | 'skipped' | 'failed',
  detail: string | null, // the error, or the skip reason
  at: Date,
) {
  await db
    .prepare(
      `UPDATE outbox_status SET status = ?, attempts = attempts + 1, last_error = ?, updated_at = ?
       WHERE ref_kind = ? AND ref_id = ? AND step = ?`,
    )
    .bind(status, detail, at.toISOString(), kind, refId, step)
    .run();
}

/** Retry delay for queue message attempt n (1-based): 1, 2, 4, 8… minutes, capped at 1 hour. */
export const retryDelaySeconds = (attempts: number) =>
  Math.min(60 * 2 ** Math.max(0, attempts - 1), 3600);
