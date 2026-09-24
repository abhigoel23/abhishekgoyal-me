// Daily maintenance (src/worker.ts `scheduled`): re-sync undelivered steps, purge old data, run the
// deep health check, and alert on anything wrong.
import { sendAlert, type AlertTransport } from './alert';
import { getAccessToken, SHEETS_SCOPE } from './googleAuth';
import { checkTelegram } from './notifications';
import { BOOKING_STEPS, getBookingEvent, type BookingHandlers } from './bookings';
import { deliverLead, runSteps, type RefKind, type StepHandlers } from './outbox';
import { MONTHLY_HEADERS, MONTHLY_TAB, type MonthlySheet } from './monthly';
import {
  appendGeneratedRow,
  deleteSubscriberRows,
  purgeBookingRows,
  purgeLeadRows,
  readFirstColumn,
  readSheetTitle,
} from './sheets';
import { checkSegment, deleteContact } from './resendContacts';
import { deliverSubscriber, type SubscriberHandlers } from './subscriberDelivery';
import { deleteUnsubscribed, purgeUnconfirmed, unsubscribedDue } from './subscriberStore';

export const RETENTION_MONTHS = 18;
// Rows younger than this may still be in the queue's own retries; leave them to it.
export const RESYNC_MIN_AGE_MS = 60 * 60 * 1000;
export const RESYNC_BATCH = 50;

export function retentionCutoff(now: Date): string {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  return cutoff.toISOString();
}

/** Refs (lead IDs or booking events) with a pending or failed step that has a handler, oldest first. */
export async function refsToResync(db: D1Database, kind: RefKind, steps: string[], now: Date) {
  if (!steps.length) return [];
  const before = new Date(now.getTime() - RESYNC_MIN_AGE_MS).toISOString();
  const { results } = await db
    .prepare(
      `SELECT ref_id, MIN(updated_at) AS oldest FROM outbox_status
       WHERE ref_kind = ? AND status IN ('pending', 'failed') AND updated_at < ?
         AND step IN (${steps.map(() => '?').join(', ')})
       GROUP BY ref_id ORDER BY oldest LIMIT ${RESYNC_BATCH}`,
    )
    .bind(kind, before, ...steps)
    .all<{ ref_id: string }>();
  return results.map((r) => r.ref_id);
}

export type AllHandlers = {
  lead: StepHandlers;
  booking: BookingHandlers;
  subscriber: SubscriberHandlers;
};

export async function resync(db: D1Database, handlers: AllHandlers, now: Date) {
  const { lead: leadHandlers, booking: bookingHandlers, subscriber: subscriberHandlers } = handlers;
  const stillFailing: string[] = [];
  const leadIds = await refsToResync(db, 'lead', Object.keys(leadHandlers), now);
  for (const id of leadIds) {
    const { failed } = await deliverLead(db, id, leadHandlers);
    if (failed.length) stillFailing.push(`lead ${id}: ${failed.join(', ')}`);
  }
  const bookingRefs = await refsToResync(db, 'booking', Object.keys(bookingHandlers), now);
  for (const ref of bookingRefs) {
    const event = await getBookingEvent(db, ref);
    const { failed } = await runSteps(db, 'booking', ref, event, BOOKING_STEPS, bookingHandlers);
    if (failed.length) stillFailing.push(`booking ${ref}: ${failed.join(', ')}`);
  }
  const subscriberIds = await refsToResync(db, 'subscriber', Object.keys(subscriberHandlers), now);
  for (const id of subscriberIds) {
    const { failed } = await deliverSubscriber(db, id, subscriberHandlers);
    if (failed.length) stillFailing.push(`subscriber ${id}: ${failed.join(', ')}`);
  }
  return {
    attempted: leadIds.length + bookingRefs.length + subscriberIds.length,
    stillFailing,
  };
}

/** Deletes leads and bookings older than the retention period, with their outbox rows. */
export async function purge(db: D1Database, now: Date) {
  const cutoff = retentionCutoff(now);
  const results = await db.batch([
    db
      .prepare(
        `DELETE FROM outbox_status WHERE ref_kind = 'lead'
         AND ref_id IN (SELECT lead_id FROM leads WHERE created_at < ?)`,
      )
      .bind(cutoff),
    db
      .prepare(
        // Booking refs are "<booking uid>:<event>".
        `DELETE FROM outbox_status WHERE ref_kind = 'booking'
         AND substr(ref_id, 1, instr(ref_id, ':') - 1) IN
           (SELECT booking_id FROM bookings WHERE created_at < ?)`,
      )
      .bind(cutoff),
    db.prepare('DELETE FROM leads WHERE created_at < ?').bind(cutoff),
    db.prepare('DELETE FROM bookings WHERE created_at < ?').bind(cutoff),
  ]);
  return { leads: results[2]!.meta.changes, bookings: results[3]!.meta.changes };
}

export type HealthChecks = Record<string, () => Promise<void>>;

export async function runHealthChecks(checks: HealthChecks) {
  const entries = await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      try {
        await check();
        return [name, 'ok'] as const;
      } catch (error) {
        return [name, String(error).slice(0, 200)] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<string, string>;
}

/**
 * Deep checks with real credentials (read-only). The Resend sending key isn't checked: it can't call
 * any read endpoint, so a broken key shows up as failed notify steps and their alerts instead. The
 * full-access contacts key is checked by reading the newsletter segment.
 */
export function deepChecks(env: Env): HealthChecks {
  // Checked once configured (production sets them at the M5 gate, #114), so an environment that
  // hasn't switched the newsletter on doesn't alert every day.
  const contacts: HealthChecks =
    env.RESEND_CONTACTS_KEY && env.RESEND_SEGMENT_ID
      ? { resend_contacts: () => checkSegment(env.RESEND_CONTACTS_KEY, env.RESEND_SEGMENT_ID) }
      : {};
  return {
    ...contacts,
    sheets: async () => {
      if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_KEY || !env.SHEET_ID) {
        throw new Error('not configured');
      }
      const token = await getAccessToken(
        { email: env.GOOGLE_SA_EMAIL, privateKeyPem: env.GOOGLE_SA_KEY },
        SHEETS_SCOPE,
      );
      await readSheetTitle(token, env.SHEET_ID);
    },
    telegram: async () => {
      if (!env.TELEGRAM_BOT_TOKEN) throw new Error('not configured');
      await checkTelegram(env.TELEGRAM_BOT_TOKEN);
    },
  };
}

/** Deletes expired rows from the Leads Sheet (the D1 purge can't reach it). Undefined if unconfigured. */
export function sheetRetention(env: Env) {
  const { GOOGLE_SA_EMAIL: email, GOOGLE_SA_KEY: key, SHEET_ID: sheetId } = env;
  if (!email || !key || !sheetId) return undefined;
  return async (cutoffIso: string) => {
    const token = await getAccessToken({ email, privateKeyPem: key }, SHEETS_SCOPE);
    return (
      (await purgeLeadRows(token, sheetId, cutoffIso)) +
      (await purgeBookingRows(token, sheetId, cutoffIso))
    );
  };
}

/** The Leads Sheet's Monthly tab (docs/GROWTH.md). Undefined if the Sheet isn't configured. */
export function monthlySheet(env: Env): MonthlySheet | undefined {
  const { GOOGLE_SA_EMAIL: email, GOOGLE_SA_KEY: key, SHEET_ID: sheetId } = env;
  if (!email || !key || !sheetId) return undefined;
  const token = () => getAccessToken({ email, privateKeyPem: key }, SHEETS_SCOPE);
  return {
    months: async () => readFirstColumn(await token(), sheetId, MONTHLY_TAB),
    append: async (row) =>
      appendGeneratedRow(await token(), sheetId, MONTHLY_TAB, MONTHLY_HEADERS, row),
  };
}

/** Where an unsubscribed address lives besides D1. Each is left out when not configured. */
export type UnsubscribedCleanup = {
  sheetRows?: (subscriberIds: string[]) => Promise<number>;
  contact?: (email: string) => Promise<void>;
};

export function unsubscribedCleanup(env: Env): UnsubscribedCleanup {
  const { GOOGLE_SA_EMAIL: email, GOOGLE_SA_KEY: key, SHEET_ID: sheetId } = env;
  return {
    ...(email && key && sheetId
      ? {
          sheetRows: async (ids: string[]) => {
            const token = await getAccessToken({ email, privateKeyPem: key }, SHEETS_SCOPE);
            return deleteSubscriberRows(token, sheetId, ids);
          },
        }
      : {}),
    ...(env.RESEND_CONTACTS_KEY
      ? { contact: (address: string) => deleteContact(env.RESEND_CONTACTS_KEY, address) }
      : {}),
  };
}

/**
 * Deletes subscribers 30 days after they unsubscribed (privacy policy): Sheet rows and the Resend
 * contact first, then D1, so anything that fails is still in D1 and is retried the next day.
 */
export async function purgeUnsubscribed(db: D1Database, now: Date, cleanup: UnsubscribedCleanup) {
  const due = await unsubscribedDue(db, now);
  const failed: string[] = [];
  if (!due.length) return { deleted: 0, failed };
  if (cleanup.sheetRows) {
    try {
      await cleanup.sheetRows(due.map((s) => s.subscriber_id));
    } catch (error) {
      return { deleted: 0, failed: [`sheet: ${String(error).slice(0, 200)}`] };
    }
  }
  const cleared: string[] = [];
  for (const { subscriber_id: id, email } of due) {
    try {
      await cleanup.contact?.(email);
      cleared.push(id);
    } catch (error) {
      failed.push(`subscriber ${id}: ${String(error).slice(0, 200)}`);
    }
  }
  return { deleted: await deleteUnsubscribed(db, cleared), failed };
}

export async function dailyMaintenance(
  db: D1Database,
  handlers: AllHandlers,
  checks: HealthChecks,
  transports: AlertTransport[],
  purgeSheet?: (cutoffIso: string) => Promise<number>,
  cleanup: UnsubscribedCleanup = {},
  now = new Date(),
) {
  const synced = await resync(db, handlers, now);
  const unsubscribed = await purgeUnsubscribed(db, now, cleanup);
  const purged = {
    ...(await purge(db, now)),
    unconfirmedSubscribers: await purgeUnconfirmed(db, now),
    unsubscribedSubscribers: unsubscribed.deleted,
  };
  if (unsubscribed.failed.length) {
    await sendAlert(
      { subject: 'Deleting unsubscribed subscribers failed', lines: unsubscribed.failed },
      transports,
    );
  }
  let sheetRowsPurged: number | string = 'not configured';
  if (purgeSheet) {
    try {
      sheetRowsPurged = await purgeSheet(retentionCutoff(now));
    } catch (error) {
      sheetRowsPurged = 'failed';
      await sendAlert(
        { subject: 'Sheet retention cleanup failed', lines: [String(error).slice(0, 300)] },
        transports,
      );
    }
  }
  const health = await runHealthChecks(checks);
  const unhealthy = Object.entries(health).filter(([, status]) => status !== 'ok');

  console.log('daily maintenance', {
    synced: synced.attempted,
    purged: { ...purged, sheetRows: sheetRowsPurged },
    health,
  });
  if (unhealthy.length) {
    await sendAlert(
      { subject: 'Health check failed', lines: unhealthy.map(([n, s]) => `${n}: ${s}`) },
      transports,
    );
  }
  if (synced.stillFailing.length) {
    await sendAlert(
      { subject: 'Delivery still failing after re-sync', lines: synced.stillFailing },
      transports,
    );
  }
  return { synced, purged, health };
}
