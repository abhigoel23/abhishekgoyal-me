import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MONTHLY_HEADERS,
  monthlyCounts,
  monthlyRow,
  previousMonth,
  recordMonth,
  type MonthlySheet,
} from './monthly';

// The real schema, so the counting SQL runs as it would on D1.
function migratedDb() {
  const sqlite = new DatabaseSync(':memory:');
  const dir = new URL('../../../migrations/', import.meta.url);
  for (const file of readdirSync(dir).sort()) sqlite.exec(readFileSync(new URL(file, dir), 'utf8'));
  // Just enough of D1's API for monthlyCounts.
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: string[]) => ({
        first: async () => ({ ...sqlite.prepare(sql).get(...args) }),
      }),
    }),
  } as unknown as D1Database;
  return { sqlite, db };
}

let n = 0;
function lead(
  sqlite: DatabaseSync,
  createdAt: string,
  path: 'project' | 'role',
  flags: { debug?: boolean; internal?: boolean } = {},
) {
  n += 1;
  sqlite
    .prepare(
      `INSERT INTO leads (lead_id, created_at, path, name, email, consent_at, idempotency_key,
         ga_debug, ga_internal) VALUES (?, ?, ?, 'N', 'n@example.com', ?, ?, ?, ?)`,
    )
    .run(
      `lead-${n}`,
      createdAt,
      path,
      createdAt,
      `key-${n}`,
      flags.debug ? '1' : null,
      flags.internal ? '1' : null,
    );
}

function subscriber(
  sqlite: DatabaseSync,
  status: 'pending' | 'confirmed' | 'unsubscribed',
  dates: { confirmed?: string; unsubscribed?: string },
  internal = false,
) {
  n += 1;
  sqlite
    .prepare(
      `INSERT INTO subscribers (subscriber_id, email, status, source, created_at, updated_at, consent_at,
         confirmed_at, unsubscribed_at, ga_internal)
       VALUES (?, ?, ?, 'checklist', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z',
         '2026-09-01T00:00:00Z', ?, ?, ?)`,
    )
    .run(
      `sub-${n}`,
      `s${n}@example.com`,
      status,
      dates.confirmed ?? null,
      dates.unsubscribed ?? null,
      internal ? '1' : null,
    );
}

describe('previousMonth', () => {
  it('gives last month and its UTC bounds', () => {
    expect(previousMonth(new Date('2026-11-01T02:00:00Z'))).toEqual({
      month: '2026-10',
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-11-01T00:00:00.000Z',
    });
  });

  it('wraps across the year', () => {
    expect(previousMonth(new Date('2027-01-03T00:00:00Z')).month).toBe('2026-12');
  });
});

describe('monthlyCounts', () => {
  const { start, end } = previousMonth(new Date('2026-11-01T02:00:00Z'));

  it('counts only the month, and keeps test rows apart', async () => {
    const { sqlite, db } = migratedDb();
    lead(sqlite, '2026-10-01T00:00:00.000Z', 'project'); // first instant: in
    lead(sqlite, '2026-10-15T12:00:00.000Z', 'role');
    lead(sqlite, '2026-10-31T23:59:59.999Z', 'project'); // last instant: in
    lead(sqlite, '2026-09-30T23:59:59.999Z', 'project'); // September: out
    lead(sqlite, '2026-11-01T00:00:00.000Z', 'project'); // November: out
    lead(sqlite, '2026-10-10T00:00:00.000Z', 'project', { debug: true });
    lead(sqlite, '2026-10-11T00:00:00.000Z', 'role', { internal: true });

    sqlite.exec(`INSERT INTO bookings VALUES
      ('b1', '2026-10-02T00:00:00Z', 'created', '2026-10-05T10:00:00Z', 'N', 'n@example.com', 'intro', '2026-10-02T00:00:00Z'),
      ('b2', '2026-10-03T00:00:00Z', 'cancelled', '2026-10-06T10:00:00Z', 'N', 'n@example.com', 'intro', '2026-10-04T00:00:00Z'),
      ('b3', '2026-09-03T00:00:00Z', 'created', '2026-09-06T10:00:00Z', 'N', 'n@example.com', 'intro', '2026-09-03T00:00:00Z')`);

    subscriber(sqlite, 'confirmed', { confirmed: '2026-10-05T00:00:00Z' });
    subscriber(sqlite, 'confirmed', { confirmed: '2026-09-05T00:00:00Z' }); // active, not a sign-up this month
    subscriber(sqlite, 'unsubscribed', {
      confirmed: '2026-10-06T00:00:00Z',
      unsubscribed: '2026-10-20T00:00:00Z',
    });
    subscriber(sqlite, 'confirmed', { confirmed: '2026-10-07T00:00:00Z' }, true); // internal test
    subscriber(sqlite, 'pending', {});

    sqlite.exec(`INSERT INTO outbox_status (ref_kind, ref_id, step, status, attempts, updated_at)
      VALUES ('lead', 'lead-1', 'sheets', 'failed', 3, '2026-10-02T00:00:00Z')`);

    expect(await monthlyCounts(db, start, end)).toEqual({
      leads: 3,
      project_leads: 2,
      role_leads: 1,
      test_leads: 2,
      calls_booked: 2,
      calls_cancelled: 1,
      sign_ups: 2,
      unsubscribes: 1,
      active_subscribers: 2,
      failed_deliveries: 1,
    });
  });

  it('returns zeros for an empty month', async () => {
    const { db } = migratedDb();
    const counts = await monthlyCounts(db, start, end);
    expect(Object.values(counts).every((v) => v === 0)).toBe(true);
  });
});

describe('monthlyRow', () => {
  it('lines up with the Worker-written headers, with numbers as numbers', () => {
    const now = new Date('2026-11-01T02:00:00Z');
    const counts = {
      leads: 3,
      project_leads: 2,
      role_leads: 1,
      test_leads: 0,
      calls_booked: 1,
      calls_cancelled: 0,
      sign_ups: 4,
      unsubscribes: 0,
      active_subscribers: 9,
      failed_deliveries: 0,
    };
    const row = monthlyRow('2026-10', counts, now);
    expect(row).toEqual(['2026-10', 3, 2, 1, 0, 1, 0, 4, 0, 9, 0, '2026-11-01T02:00:00.000Z']);
    expect(MONTHLY_HEADERS[row.length - 1]).toBe('Recorded at (UTC)');
    expect(MONTHLY_HEADERS[1]).toBe('Leads');
  });
});

describe('recordMonth', () => {
  const { db } = migratedDb();
  let sheet: MonthlySheet & { rows: (string | number)[][] };

  beforeEach(() => {
    const rows: (string | number)[][] = [];
    sheet = {
      rows,
      months: async () => ['Month (UTC)', ...rows.map((r) => String(r[0]))],
      append: async (row) => {
        rows.push(row);
      },
    };
  });

  it('records last month once, however many times the cron runs', async () => {
    expect(await recordMonth(db, sheet, [], new Date('2026-11-01T02:00:00Z'))).toBe(
      '2026-10 recorded',
    );
    expect(await recordMonth(db, sheet, [], new Date('2026-11-02T02:00:00Z'))).toBe(
      '2026-10 already recorded',
    );
    expect(sheet.rows).toHaveLength(1);
  });

  it('catches up on a later day in the window if day 1 was missed', async () => {
    expect(await recordMonth(db, sheet, [], new Date('2026-11-07T02:00:00Z'))).toBe(
      '2026-10 recorded',
    );
  });

  it('does nothing after day 7 or without a Sheet', async () => {
    expect(await recordMonth(db, sheet, [], new Date('2026-11-08T02:00:00Z'))).toBe(
      'outside window',
    );
    expect(await recordMonth(db, undefined, [], new Date('2026-11-01T02:00:00Z'))).toBe(
      'not configured',
    );
    expect(sheet.rows).toHaveLength(0);
  });

  it('alerts when the Sheet fails, and leaves the next day to retry', async () => {
    const transport = vi.fn(async () => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sheet.append = async () => {
      throw new Error('Sheets 400: Unable to parse range: Monthly!A1');
    };
    expect(await recordMonth(db, sheet, [transport], new Date('2026-11-01T02:00:00Z'))).toBe(
      'failed',
    );
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Recording 2026-10 in the Monthly tab failed' }),
    );
  });
});
