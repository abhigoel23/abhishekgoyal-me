// Google Sheets delivery: the Sheet is a human-friendly view of D1 (ADR 003), so option codes are
// written as their labels. Rows go in with valueInputOption=RAW and every cell passes sanitizeCell.
import { budgetBands, leadPaths, serviceOptions, timelines, workModes } from '../../data/lead';
import type { LeadRow } from './leadStore';
import type { SubscriberRow } from './subscriberStore';
import { sanitizeCell } from './sanitize';

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

const allBudgets = [...budgetBands.USD, ...budgetBands.INR];
const label = (options: readonly { value: string; label: string }[], value: string | null) =>
  value ? (options.find((o) => o.value === value)?.label ?? value) : '';

// Header row and cell builders, kept together so they can't drift apart. `status` and `notes` are for
// working the lead by hand (New → Contacted → Call booked → Won/Lost); the Worker never edits them.
const LEAD_COLUMNS: [header: string, cell: (l: LeadRow) => string | null][] = [
  ['Lead ID', (l) => l.lead_id],
  ['Received (UTC)', (l) => l.created_at],
  ['Path', (l) => label(leadPaths, l.path)],
  ['Name', (l) => l.name],
  ['Email', (l) => l.email],
  ['Company', (l) => l.company],
  ['Service', (l) => label(serviceOptions, l.service)],
  ['Budget', (l) => label(allBudgets, l.budget)],
  ['Timeline', (l) => label(timelines, l.timeline)],
  ['Role title', (l) => l.role_title],
  ['Work mode', (l) => label(workModes, l.work_mode)],
  ['Job link', (l) => l.job_url],
  ['Message', (l) => l.message],
  ['Source page', (l) => l.source_page],
  ['UTM source', (l) => l.utm_source],
  ['UTM medium', (l) => l.utm_medium],
  ['UTM campaign', (l) => l.utm_campaign],
  ['Referrer', (l) => l.referrer],
  ['Status', () => 'New'],
  ['Notes', () => ''],
];

export const LEAD_HEADERS = LEAD_COLUMNS.map(([header]) => header);

export function leadToRow(lead: LeadRow): string[] {
  return LEAD_COLUMNS.map(([, cell]) => sanitizeCell(cell(lead)));
}

/** Labelled, unsanitised fields for plain-text email. Skips empties and the manual CRM columns. */
export function leadFields(lead: LeadRow): [string, string][] {
  return LEAD_COLUMNS.filter(([header]) => header !== 'Status' && header !== 'Notes')
    .map(([header, cell]): [string, string] => [header, cell(lead) ?? ''])
    .filter(([, value]) => value !== '');
}

export { label as optionLabel };

async function sheetsFetch(token: string, url: string, init: RequestInit = {}, fetcher = fetch) {
  const res = await fetcher(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Sheets ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// Writes the header row if the tab is empty. Checked once per isolate.
const headerChecked = new Set<string>();

async function ensureHeader(
  token: string,
  sheetId: string,
  tab: string,
  headers: string[],
  fetcher = fetch,
) {
  const key = `${sheetId}|${tab}`;
  if (headerChecked.has(key)) return;
  const range = encodeURIComponent(`${tab}!1:1`);
  const data = (await sheetsFetch(token, `${API}/${sheetId}/values/${range}`, {}, fetcher)) as {
    values?: string[][];
  };
  if (!data.values?.[0]?.length) {
    await sheetsFetch(
      token,
      `${API}/${sheetId}/values/${range}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [headers] }) },
      fetcher,
    );
  }
  headerChecked.add(key);
}

async function appendRow(
  token: string,
  sheetId: string,
  tab: string,
  headers: string[],
  row: (string | number)[],
  fetcher: typeof fetch,
) {
  await ensureHeader(token, sheetId, tab, headers, fetcher);
  const range = encodeURIComponent(`${tab}!A1`);
  await sheetsFetch(
    token,
    `${API}/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [row] }) },
    fetcher,
  );
}

export async function appendLead(
  token: string,
  sheetId: string,
  lead: LeadRow,
  fetcher: typeof fetch = fetch,
) {
  await appendRow(token, sheetId, 'Leads', LEAD_HEADERS, leadToRow(lead), fetcher);
}

/** One row per Cal.com event (created, rescheduled, cancelled), so the tab reads as a history. */
export type BookingEventRow = {
  booking_id: string;
  event: string;
  start_time: string;
  name: string;
  email: string;
  event_type: string;
  received_at: string;
};

const BOOKING_COLUMNS: [header: string, cell: (b: BookingEventRow) => string][] = [
  ['Booking ID', (b) => b.booking_id],
  ['Received (UTC)', (b) => b.received_at],
  ['Event', (b) => b.event],
  ['Call starts (UTC)', (b) => b.start_time],
  ['Name', (b) => b.name],
  ['Email', (b) => b.email],
  ['Event type', (b) => b.event_type],
];

export const BOOKING_HEADERS = BOOKING_COLUMNS.map(([header]) => header);

export async function appendBooking(
  token: string,
  sheetId: string,
  booking: BookingEventRow,
  fetcher: typeof fetch = fetch,
) {
  const row = BOOKING_COLUMNS.map(([, cell]) => sanitizeCell(cell(booking)));
  await appendRow(token, sheetId, 'Bookings', BOOKING_HEADERS, row, fetcher);
}

// Read-only check for /api/health (#61): proves the token works and the Sheet is shared with us.
export async function readSheetTitle(
  token: string,
  sheetId: string,
  fetcher: typeof fetch = fetch,
) {
  const data = (await sheetsFetch(
    token,
    `${API}/${sheetId}?fields=properties.title`,
    {},
    fetcher,
  )) as { properties: { title: string } };
  return data.properties.title;
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** 0-based row indexes (header excluded) whose "Received (UTC)" is before the cutoff, as descending runs. */
export function expiredRowRuns(received: string[][], cutoffIso: string): [number, number][] {
  return rowRuns(
    received
      .map((row, i) => [i, row[0] ?? ''] as const)
      .filter(([i, v]) => i > 0 && ISO_TIMESTAMP.test(v) && v < cutoffIso)
      .map(([i]) => i),
  );
}

/** Ascending 0-based row indexes → [start, end) runs, last first, ready for deleteDimension. */
function rowRuns(indexes: number[]): [number, number][] {
  const runs: [number, number][] = [];
  for (const i of indexes) {
    const last = runs[runs.length - 1];
    if (last && last[1] === i) last[1] = i + 1;
    else runs.push([i, i + 1]);
  }
  // Delete from the bottom up so earlier deletions don't shift the later ranges.
  return runs.reverse();
}

/**
 * Retention for the Sheet copy (privacy policy: 18 months). Deletes rows by their "Received (UTC)"
 * date, so it works regardless of D1, sorting or filters, and is safe to repeat. Returns rows deleted.
 */
async function purgeRows(
  token: string,
  sheetId: string,
  tab: string,
  headers: string[],
  cutoffIso: string,
  fetcher: typeof fetch,
) {
  const column = String.fromCharCode(65 + headers.indexOf('Received (UTC)'));
  const range = encodeURIComponent(`${tab}!${column}:${column}`);
  const data = (await sheetsFetch(token, `${API}/${sheetId}/values/${range}`, {}, fetcher)) as {
    values?: string[][];
  };
  return deleteRowRuns(token, sheetId, tab, expiredRowRuns(data.values ?? [], cutoffIso), fetcher);
}

async function deleteRowRuns(
  token: string,
  sheetId: string,
  tab: string,
  runs: [number, number][],
  fetcher: typeof fetch,
) {
  if (!runs.length) return 0;
  const meta = (await sheetsFetch(
    token,
    `${API}/${sheetId}?fields=sheets.properties(sheetId,title)`,
    {},
    fetcher,
  )) as { sheets: { properties: { sheetId: number; title: string } }[] };
  const gid = meta.sheets.find((s) => s.properties.title === tab)?.properties.sheetId;
  if (gid === undefined) throw new Error(`Tab "${tab}" not found`);

  await sheetsFetch(
    token,
    `${API}/${sheetId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: runs.map(([startIndex, endIndex]) => ({
          deleteDimension: { range: { sheetId: gid, dimension: 'ROWS', startIndex, endIndex } },
        })),
      }),
    },
    fetcher,
  );
  return runs.reduce((n, [start, end]) => n + end - start, 0);
}

export const purgeLeadRows = (
  token: string,
  sheetId: string,
  cutoffIso: string,
  fetcher: typeof fetch = fetch,
) => purgeRows(token, sheetId, 'Leads', LEAD_HEADERS, cutoffIso, fetcher);

export const purgeBookingRows = (
  token: string,
  sheetId: string,
  cutoffIso: string,
  fetcher: typeof fetch = fetch,
) => purgeRows(token, sheetId, 'Bookings', BOOKING_HEADERS, cutoffIso, fetcher);

// Newsletter subscribers (#110): one row per confirmed address. The Worker writes the row on confirm and
// flips `Status` when someone unsubscribes; nothing else is edited.
const SUBSCRIBER_COLUMNS: [header: string, cell: (s: SubscriberRow) => string | null][] = [
  ['Subscriber ID', (s) => s.subscriber_id],
  ['Confirmed (UTC)', (s) => s.confirmed_at],
  ['Email', (s) => s.email],
  ['Source', (s) => s.source],
  ['Status', () => 'Subscribed'],
  ['Source page', (s) => s.source_page],
  ['UTM source', (s) => s.utm_source],
  ['UTM medium', (s) => s.utm_medium],
  ['UTM campaign', (s) => s.utm_campaign],
  ['Referrer', (s) => s.referrer],
];

export const SUBSCRIBER_HEADERS = SUBSCRIBER_COLUMNS.map(([header]) => header);
export const SUBSCRIBERS_TAB = 'Subscribers';

export function subscriberToRow(subscriber: SubscriberRow): string[] {
  return SUBSCRIBER_COLUMNS.map(([, cell]) => sanitizeCell(cell(subscriber)));
}

export async function appendSubscriber(
  token: string,
  sheetId: string,
  subscriber: SubscriberRow,
  fetcher: typeof fetch = fetch,
) {
  await appendRow(
    token,
    sheetId,
    SUBSCRIBERS_TAB,
    SUBSCRIBER_HEADERS,
    subscriberToRow(subscriber),
    fetcher,
  );
}

/**
 * Sets `Status` on every row for this subscriber (a re-subscriber has more than one). Returns the rows
 * updated; 0 if the row was never written, which is fine: there is nothing to mark.
 */
export async function setSubscriberStatus(
  token: string,
  sheetId: string,
  subscriberId: string,
  status: string,
  fetcher: typeof fetch = fetch,
) {
  const idRange = encodeURIComponent(`${SUBSCRIBERS_TAB}!A:A`);
  const data = (await sheetsFetch(token, `${API}/${sheetId}/values/${idRange}`, {}, fetcher)) as {
    values?: string[][];
  };
  const column = String.fromCharCode(65 + SUBSCRIBER_HEADERS.indexOf('Status'));
  const rows = (data.values ?? [])
    .map((row, i) => [i + 1, row[0]] as const) // 1-based sheet rows
    .filter(([n, id]) => n > 1 && id === subscriberId)
    .map(([n]) => n);
  if (!rows.length) return 0;
  await sheetsFetch(
    token,
    `${API}/${sheetId}/values:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: rows.map((n) => ({
          range: `${SUBSCRIBERS_TAB}!${column}${n}`,
          values: [[sanitizeCell(status)]],
        })),
      }),
    },
    fetcher,
  );
  return rows.length;
}

/**
 * Deletes every row of these subscribers (a re-subscriber can have several), for the purge 30 days
 * after unsubscribing (#113). Matches on the Subscriber ID column; safe to repeat. Returns rows deleted.
 */
export async function deleteSubscriberRows(
  token: string,
  sheetId: string,
  subscriberIds: string[],
  fetcher: typeof fetch = fetch,
) {
  if (!subscriberIds.length) return 0;
  const ids = new Set(subscriberIds);
  const idRange = encodeURIComponent(`${SUBSCRIBERS_TAB}!A:A`);
  const data = (await sheetsFetch(token, `${API}/${sheetId}/values/${idRange}`, {}, fetcher)) as {
    values?: string[][];
  };
  const indexes = (data.values ?? [])
    .map((row, i) => [i, row[0] ?? ''] as const)
    .filter(([i, id]) => i > 0 && ids.has(id))
    .map(([i]) => i);
  return deleteRowRuns(token, sheetId, SUBSCRIBERS_TAB, rowRuns(indexes), fetcher);
}

/** Column A of a tab, header included (the Monthly tab's months). */
export async function readFirstColumn(
  token: string,
  sheetId: string,
  tab: string,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const range = encodeURIComponent(`${tab}!A:A`);
  const data = (await sheetsFetch(token, `${API}/${sheetId}/values/${range}`, {}, fetcher)) as {
    values?: string[][];
  };
  return (data.values ?? []).map((row) => row[0] ?? '');
}

/** Appends a row of values we generate ourselves (counts, never user input), writing the header first. */
export async function appendGeneratedRow(
  token: string,
  sheetId: string,
  tab: string,
  headers: string[],
  row: (string | number)[],
  fetcher: typeof fetch = fetch,
) {
  await appendRow(token, sheetId, tab, headers, row, fetcher);
}
