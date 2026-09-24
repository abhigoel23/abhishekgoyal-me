// Direct access to the local e2e D1 (playwright.lead.config.ts), through wrangler.
import { execFileSync } from 'node:child_process';
import { PERSIST } from '../../playwright.lead.config';

/**
 * Runs SQL against the local e2e D1 and returns the result rows. The Worker's queue consumer may still
 * be writing outbox rows to the same SQLite file, so a query can hit SQLITE_BUSY; retry a few times.
 */
export function query<T = Record<string, unknown>>(sql: string): T[] {
  for (let attempt = 1; ; attempt++) {
    try {
      const out = execFileSync(
        'pnpm',
        [
          'exec',
          'wrangler',
          'd1',
          'execute',
          'DB',
          '--env',
          'staging',
          '--local',
          '--persist-to',
          PERSIST,
          '--json',
          '--command',
          sql,
        ],
        { encoding: 'utf8' },
      );
      return JSON.parse(out)[0].results as T[];
    } catch (error) {
      if (attempt >= 5 || !String(error).includes('SQLITE_BUSY')) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * attempt);
    }
  }
}

/** The first column of the first row, as a number (for SELECT count(*) …). */
export const count = (sql: string) => Number(Object.values(query(sql)[0] ?? {})[0]);
