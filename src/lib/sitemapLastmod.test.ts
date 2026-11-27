import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { postDate, writingLastmod } from './sitemapLastmod.mjs';

const post = (fields: string) => `---\ntitle: A post\n${fields}\n---\n\nBody.\n`;

describe('postDate', () => {
  it('prefers updatedDate over pubDate', () => {
    expect(postDate(post('pubDate: 2026-09-24\nupdatedDate: 2026-10-02'))).toEqual(
      new Date('2026-10-02'),
    );
    expect(postDate(post("pubDate: '2026-09-24'"))).toEqual(new Date('2026-09-24'));
  });

  it('skips drafts and posts without a date', () => {
    expect(postDate(post('pubDate: 2026-09-24\ndraft: true'))).toBeNull();
    expect(postDate(post('tags: [a]'))).toBeNull();
  });
});

describe('writingLastmod', () => {
  it('dates each post and the /writing index by the newest post', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lastmod-'));
    writeFileSync(join(dir, 'old.mdx'), post('pubDate: 2026-09-01'));
    writeFileSync(join(dir, 'new.mdx'), post('pubDate: 2026-11-20'));
    writeFileSync(join(dir, 'draft.mdx'), post('pubDate: 2026-11-25\ndraft: true'));
    const dates = writingLastmod(dir);
    expect(dates.get('/writing/old')).toEqual(new Date('2026-09-01'));
    expect(dates.get('/writing')).toEqual(new Date('2026-11-20'));
    expect(dates.has('/writing/draft')).toBe(false);
  });

  it('dates the real posts', () => {
    const dates = writingLastmod('src/content/writing');
    expect(dates.get('/writing/offline-first-sync-lessons')).toBeInstanceOf(Date);
  });
});
