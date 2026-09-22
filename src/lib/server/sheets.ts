// Google Sheets delivery: the Sheet is a human-friendly view of D1 (ADR 003), so option codes are
// written as their labels. Rows go in with valueInputOption=RAW and every cell passes sanitizeCell.
import { budgetBands, leadPaths, serviceOptions, timelines, workModes } from '../../data/lead';
import type { LeadRow } from './leadStore';
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

async function ensureHeader(token: string, sheetId: string, tab: string, fetcher = fetch) {
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
      { method: 'PUT', body: JSON.stringify({ values: [LEAD_HEADERS] }) },
      fetcher,
    );
  }
  headerChecked.add(key);
}

export async function appendLead(
  token: string,
  sheetId: string,
  lead: LeadRow,
  fetcher: typeof fetch = fetch,
) {
  const tab = 'Leads';
  await ensureHeader(token, sheetId, tab, fetcher);
  const range = encodeURIComponent(`${tab}!A1`);
  await sheetsFetch(
    token,
    `${API}/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [leadToRow(lead)] }) },
    fetcher,
  );
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
