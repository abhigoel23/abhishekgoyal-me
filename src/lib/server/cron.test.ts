import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendAlert } from './alert';
import { purgeUnsubscribed, retentionCutoff, runHealthChecks } from './cron';
import { deleteUnsubscribed, unsubscribedDue } from './subscriberStore';

vi.mock('./subscriberStore', async (original) => ({
  ...(await original<typeof import('./subscriberStore')>()),
  unsubscribedDue: vi.fn(),
  deleteUnsubscribed: vi.fn(async (_db: unknown, ids: string[]) => ids.length),
}));

describe('retentionCutoff', () => {
  it('is 18 months before now', () => {
    expect(retentionCutoff(new Date('2026-09-22T03:30:00Z'))).toBe('2025-03-22T03:30:00.000Z');
    expect(retentionCutoff(new Date('2027-01-15T00:00:00Z'))).toBe('2025-07-15T00:00:00.000Z');
  });

  it('compares correctly with stored ISO timestamps', () => {
    const cutoff = retentionCutoff(new Date('2026-09-22T00:00:00Z'));
    expect('2025-03-21T23:59:59.999Z' < cutoff).toBe(true); // purged
    expect('2025-03-22T00:00:00.000Z' < cutoff).toBe(false); // kept
  });
});

describe('runHealthChecks', () => {
  it('reports each check as ok or its error, without one failure hiding another', async () => {
    const result = await runHealthChecks({
      sheets: async () => {},
      resend: async () => {
        throw new Error('401 invalid key');
      },
    });
    expect(result).toEqual({ sheets: 'ok', resend: 'Error: 401 invalid key' });
  });
});

describe('sendAlert', () => {
  it('logs and tries every transport even if one fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = vi.fn(async () => {});
    const broken = vi.fn(async () => Promise.reject(new Error('down')));
    await sendAlert({ subject: 'x', lines: ['lead 1'] }, [broken, ok]);
    expect(ok).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('[alert] x', ['lead 1']);
    log.mockRestore();
  });
});

describe('purgeUnsubscribed', () => {
  const db = {} as D1Database;
  const now = new Date('2026-09-24T00:00:00Z');
  const due = [
    { subscriber_id: 's-1', email: 'a@b.in' },
    { subscriber_id: 's-2', email: 'c@d.in' },
  ];
  beforeEach(() => {
    vi.mocked(unsubscribedDue).mockResolvedValue(due);
    vi.mocked(deleteUnsubscribed).mockClear();
  });

  it('clears the Sheet and Resend, then deletes from D1', async () => {
    const order: string[] = [];
    const sheetRows = vi.fn(async (ids: string[]) => (order.push(`sheet ${ids}`), 2));
    const contact = vi.fn(async (email: string) => void order.push(`resend ${email}`));
    expect(await purgeUnsubscribed(db, now, { sheetRows, contact })).toEqual({
      deleted: 2,
      failed: [],
    });
    expect(order).toEqual(['sheet s-1,s-2', 'resend a@b.in', 'resend c@d.in']);
    expect(deleteUnsubscribed).toHaveBeenCalledWith(db, ['s-1', 's-2']);
  });

  it('keeps everyone in D1 when the Sheet fails, so tomorrow retries', async () => {
    const result = await purgeUnsubscribed(db, now, {
      sheetRows: async () => Promise.reject(new Error('Sheets 503')),
      contact: vi.fn(),
    });
    expect(result.deleted).toBe(0);
    expect(result.failed[0]).toMatch(/^sheet: .*Sheets 503/);
    expect(deleteUnsubscribed).not.toHaveBeenCalled();
  });

  it('keeps only the subscriber whose Resend delete failed', async () => {
    const contact = vi.fn(async (email: string) => {
      if (email === 'a@b.in') throw new Error('Resend delete contact 500');
    });
    const result = await purgeUnsubscribed(db, now, { contact });
    expect(deleteUnsubscribed).toHaveBeenCalledWith(db, ['s-2']);
    expect(result.failed).toEqual(['subscriber s-1: Error: Resend delete contact 500']);
  });

  it('deletes from D1 alone where nothing else is configured', async () => {
    await purgeUnsubscribed(db, now, {});
    expect(deleteUnsubscribed).toHaveBeenCalledWith(db, ['s-1', 's-2']);
  });
});
