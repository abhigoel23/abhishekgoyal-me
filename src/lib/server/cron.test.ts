import { describe, expect, it, vi } from 'vitest';
import { sendAlert } from './alert';
import { retentionCutoff, runHealthChecks } from './cron';

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
