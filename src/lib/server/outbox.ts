// Runs a lead's delivery steps and records each one in outbox_status (ADR 003), so a retry only repeats
// what failed. Steps without a handler yet stay 'pending' and don't cause retries; the daily cron (#61)
// re-runs pending and failed rows once their handler exists.
// Queues deliver at least once, so a rare duplicate delivery can repeat a step; the Sheet then shows a
// duplicate row with the same Lead ID, which is harmless and easy to spot.
import { getLead, LEAD_STEPS, type LeadRow } from './leadStore';

export type LeadStep = (typeof LEAD_STEPS)[number];
export type StepResult = 'done' | 'skipped';
export type StepHandlers = Partial<Record<LeadStep, (lead: LeadRow) => Promise<StepResult>>>;

export type DeliveryResult = { found: boolean; failed: LeadStep[] };

export async function deliverLead(
  db: D1Database,
  leadId: string,
  handlers: StepHandlers,
  now: () => Date = () => new Date(),
): Promise<DeliveryResult> {
  const lead = await getLead(db, leadId);
  // Purged by retention (or never saved): nothing left to deliver.
  if (!lead) return { found: false, failed: [] };

  const { results } = await db
    .prepare("SELECT step, status FROM outbox_status WHERE ref_kind = 'lead' AND ref_id = ?")
    .bind(leadId)
    .all<{ step: LeadStep; status: string }>();
  const open = new Set(
    results.filter((r) => r.status === 'pending' || r.status === 'failed').map((r) => r.step),
  );

  const failed: LeadStep[] = [];
  for (const step of LEAD_STEPS) {
    const handler = handlers[step];
    if (!open.has(step) || !handler) continue;
    try {
      const status = await handler(lead);
      await mark(db, leadId, step, status, null, now());
    } catch (error) {
      failed.push(step);
      await mark(db, leadId, step, 'failed', String(error).slice(0, 500), now());
    }
  }
  return { found: true, failed };
}

async function mark(
  db: D1Database,
  leadId: string,
  step: LeadStep,
  status: StepResult | 'failed',
  error: string | null,
  at: Date,
) {
  await db
    .prepare(
      `UPDATE outbox_status SET status = ?, attempts = attempts + 1, last_error = ?, updated_at = ?
       WHERE ref_kind = 'lead' AND ref_id = ? AND step = ?`,
    )
    .bind(status, error, at.toISOString(), leadId, step)
    .run();
}

/** Retry delay for queue message attempt n (1-based): 1, 2, 4, 8… minutes, capped at 1 hour. */
export const retryDelaySeconds = (attempts: number) =>
  Math.min(60 * 2 ** Math.max(0, attempts - 1), 3600);
