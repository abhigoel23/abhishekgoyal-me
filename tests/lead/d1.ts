// Direct access to the local e2e D1 (playwright.lead.config.ts): read-only queries, plus single setup writes.
//
// This used to shell out to `wrangler d1 execute --local`, which starts a second workerd on the same
// SQLite file as the running `wrangler dev`. That engine could hold locks the dev server's D1 needed,
// and when the dev server's D1 hit SQLITE_BUSY its storage failed, taking unrelated in-flight requests
// down with it (500s and ProxyWorker network errors in CI). The file is in WAL mode, where a read-only
// connection can never block the writer, so the tests read it with node:sqlite instead, and the few
// setup writes (exec) hold the lock only for a single statement.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PERSIST } from '../../playwright.lead.config';

const D1_DIR = join(PERSIST, 'v3', 'd1', 'miniflare-D1DatabaseObject');

/** The staging DB's SQLite file. Miniflare names it by a hash; metadata.sqlite is its own bookkeeping. */
function databaseFile(): string {
  const files = readdirSync(D1_DIR).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  if (files.length !== 1)
    throw new Error(
      `Expected one D1 database in ${D1_DIR}, found ${files.length}: ${files.join(', ')}`,
    );
  return join(D1_DIR, files[0]!);
}

/**
 * Opens the D1 file with a busy timeout, so a brief lock is waited out instead of failing straight away.
 * `readOnly` connections never take the write lock or checkpoint.
 */
function open(readOnly: boolean) {
  return new DatabaseSync(databaseFile(), { readOnly, timeout: 5_000 });
}

/** Runs a read-only query against the local e2e D1 and returns the result rows. */
export function query<T = Record<string, unknown>>(sql: string): T[] {
  const db = open(true);
  try {
    return db.prepare(sql).all() as T[];
  } finally {
    db.close();
  }
}

/**
 * Runs a single write (test setup, e.g. planting a token). The connection lives only for this one
 * statement, so the write lock is held for about a millisecond rather than for a whole workerd start-up.
 */
export function exec(sql: string): void {
  const db = open(false);
  try {
    db.prepare(sql).run();
  } finally {
    db.close();
  }
}

/** The first column of the first row, as a number (for SELECT count(*) …). */
export const count = (sql: string) => Number(Object.values(query(sql)[0] ?? {})[0]);
