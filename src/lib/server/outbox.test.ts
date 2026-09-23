import { describe, expect, it } from 'vitest';
import { runSteps, skip } from './outbox';

// A D1 stand-in: every step starts 'pending', and each UPDATE's bound values are recorded.
function fakeDb(steps: string[]) {
  const updates: unknown[][] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        all: async () => ({ results: steps.map((step) => ({ step, status: 'pending' })) }),
        run: async () => {
          if (sql.startsWith('UPDATE')) updates.push(values);
        },
      }),
    }),
  };
  return { db: db as unknown as D1Database, updates };
}

const at = new Date('2026-09-23T10:00:00Z');

describe('runSteps', () => {
  it('records done, skipped with its reason, and failed with the error', async () => {
    const { db, updates } = fakeDb(['sheets', 'autoreply', 'ga', 'telegram']);
    const result = await runSteps(
      db,
      'lead',
      'L1',
      {},
      ['sheets', 'autoreply', 'ga', 'telegram'] as const,
      {
        sheets: async () => 'done',
        autoreply: async () => skip('rate_limited_24h'),
        ga: async () => skip('no_analytics_consent'),
        telegram: async () => {
          throw new Error('Telegram 502');
        },
      },
      () => at,
    );

    expect(result).toEqual({ found: true, failed: ['telegram'] });
    // [status, last_error, updated_at, ref_kind, ref_id, step]
    expect(updates.map((u) => [u[5], u[0], u[1]])).toEqual([
      ['sheets', 'done', null],
      ['autoreply', 'skipped', 'rate_limited_24h'],
      ['ga', 'skipped', 'no_analytics_consent'],
      ['telegram', 'failed', 'Error: Telegram 502'],
    ]);
  });
});
