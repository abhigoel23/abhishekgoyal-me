// Monthly numbers for the growth review (docs/GROWTH.md): on days 1–7 of each month (UTC), the daily cron
// appends last month's counts from D1 to the private Sheet's Monthly tab, once. Counts only, never
// personal data. The repo is public, so these numbers deliberately stay out of GitHub.
import { sendAlert, type AlertTransport } from './alert';

export const MONTHLY_WINDOW_DAYS = 7;

/** Rows marked as Abhishek's own tests (`?debug=1` / `?internal=1`), counted apart from real ones. */
const IS_TEST = `(COALESCE(ga_debug, '') = '1' OR COALESCE(ga_internal, '') = '1')`;

export type MonthlyCounts = {
  leads: number;
  project_leads: number;
  role_leads: number;
  test_leads: number;
  calls_booked: number;
  calls_cancelled: number;
  sign_ups: number;
  unsubscribes: number;
  active_subscribers: number;
  failed_deliveries: number;
};

/** The month before `now`, as "YYYY-MM" with its UTC bounds [start, end). */
export function previousMonth(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return {
    month: start.toISOString().slice(0, 7),
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export async function monthlyCounts(db: D1Database, start: string, end: string) {
  const inLeads = 'FROM leads WHERE created_at >= ?1 AND created_at < ?2';
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) ${inLeads} AND NOT ${IS_TEST}) AS leads,
         (SELECT COUNT(*) ${inLeads} AND NOT ${IS_TEST} AND path = 'project') AS project_leads,
         (SELECT COUNT(*) ${inLeads} AND NOT ${IS_TEST} AND path = 'role') AS role_leads,
         (SELECT COUNT(*) ${inLeads} AND ${IS_TEST}) AS test_leads,
         (SELECT COUNT(*) FROM bookings WHERE created_at >= ?1 AND created_at < ?2) AS calls_booked,
         (SELECT COUNT(*) FROM bookings WHERE created_at >= ?1 AND created_at < ?2
            AND status = 'cancelled') AS calls_cancelled,
         (SELECT COUNT(*) FROM subscribers WHERE confirmed_at >= ?1 AND confirmed_at < ?2
            AND NOT ${IS_TEST}) AS sign_ups,
         (SELECT COUNT(*) FROM subscribers WHERE unsubscribed_at >= ?1 AND unsubscribed_at < ?2
            AND NOT ${IS_TEST}) AS unsubscribes,
         (SELECT COUNT(*) FROM subscribers WHERE status = 'confirmed' AND NOT ${IS_TEST})
           AS active_subscribers,
         (SELECT COUNT(*) FROM outbox_status WHERE status = 'failed') AS failed_deliveries`,
    )
    .bind(start, end)
    .first<MonthlyCounts>();
  if (!row) throw new Error('monthly counts returned no row');
  return row;
}

// Columns up to "Recorded at" are written by the Worker; the rest Abhishek fills in during the review.
const MONTHLY_COLUMNS: [header: string, cell: (c: MonthlyCounts) => number][] = [
  ['Leads', (c) => c.leads],
  ['Project leads', (c) => c.project_leads],
  ['Role leads', (c) => c.role_leads],
  ['Test leads (excluded)', (c) => c.test_leads],
  ['Calls booked', (c) => c.calls_booked],
  ['Calls cancelled', (c) => c.calls_cancelled],
  ['Newsletter sign-ups', (c) => c.sign_ups],
  ['Unsubscribes', (c) => c.unsubscribes],
  ['Active subscribers (when recorded)', (c) => c.active_subscribers],
  ['Failed deliveries (when recorded)', (c) => c.failed_deliveries],
];

export const MONTHLY_TAB = 'Monthly';
export const MONTHLY_HEADERS = [
  'Month (UTC)',
  ...MONTHLY_COLUMNS.map(([header]) => header),
  'Recorded at (UTC)',
  'Visits (CF Web Analytics)',
  'Conversion %',
  'Indexed pages (GSC)',
  'Sitemap URLs',
  'Search clicks (GSC)',
  'Search impressions (GSC)',
  'Posts published',
  'Notes',
];

/** Numbers go in as numbers (RAW), so the Sheet can divide them; nothing here is user input. */
export function monthlyRow(month: string, counts: MonthlyCounts, now: Date): (string | number)[] {
  return [month, ...MONTHLY_COLUMNS.map(([, cell]) => Number(cell(counts))), now.toISOString()];
}

export type MonthlySheet = {
  /** The Month column's values (header included). */
  months: () => Promise<string[]>;
  append: (row: (string | number)[]) => Promise<void>;
};

/**
 * Records last month once, during the first days of the month. Returns what happened, for the log.
 * A failure alerts and is retried by the next day's cron until the window closes.
 */
export async function recordMonth(
  db: D1Database,
  sheet: MonthlySheet | undefined,
  transports: AlertTransport[],
  now = new Date(),
): Promise<string> {
  if (now.getUTCDate() > MONTHLY_WINDOW_DAYS) return 'outside window';
  if (!sheet) return 'not configured';
  const { month, start, end } = previousMonth(now);
  try {
    if ((await sheet.months()).includes(month)) return `${month} already recorded`;
    await sheet.append(monthlyRow(month, await monthlyCounts(db, start, end), now));
    return `${month} recorded`;
  } catch (error) {
    await sendAlert(
      {
        subject: `Recording ${month} in the Monthly tab failed`,
        lines: [String(error).slice(0, 300)],
      },
      transports,
    );
    return 'failed';
  }
}
