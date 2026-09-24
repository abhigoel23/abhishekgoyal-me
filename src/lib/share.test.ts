import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { campaignUrl, devtoTags, hashtags, parseFrontMatter } from './share';

describe('campaignUrl', () => {
  it('adds the three UTM params', () => {
    expect(
      campaignUrl('https://abhishekgoyal.me/writing/a-post', {
        source: 'linkedin',
        medium: 'social',
        campaign: 'a-post',
      }),
    ).toBe(
      'https://abhishekgoyal.me/writing/a-post?utm_source=linkedin&utm_medium=social&utm_campaign=a-post',
    );
  });

  it('replaces existing UTM params instead of duplicating them', () => {
    const url = campaignUrl('https://abhishekgoyal.me/?utm_source=old&x=1', {
      source: 'devto',
      medium: 'social',
      campaign: 'c',
    });
    const params = new URL(url).searchParams;
    expect(params.getAll('utm_source')).toEqual(['devto']);
    expect(params.get('x')).toBe('1');
  });
});

describe('parseFrontMatter', () => {
  it('reads quoted strings, tags and draft', () => {
    const meta = parseFrontMatter(
      [
        '---',
        "title: 'Offline-first: it''s a contract'",
        'description: "Lessons from Pulse\'s sync engine"',
        'pubDate: 2026-10-01',
        'tags: [offline-first, kotlin-multiplatform]',
        'draft: true',
        '---',
        'Body',
      ].join('\n'),
    );
    expect(meta).toEqual({
      title: "Offline-first: it's a contract",
      description: "Lessons from Pulse's sync engine",
      tags: ['offline-first', 'kotlin-multiplatform'],
      draft: true,
    });
  });

  it('defaults tags to [] and draft to false', () => {
    const meta = parseFrontMatter('---\ntitle: T\ndescription: D\n---\n');
    expect(meta.tags).toEqual([]);
    expect(meta.draft).toBe(false);
  });

  it('throws without a title or description', () => {
    expect(() => parseFrontMatter('---\ntitle: T\n---\n')).toThrow();
    expect(() => parseFrontMatter('no front matter')).toThrow();
  });

  it('parses every real post', () => {
    const dir = new URL('../content/writing/', import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
      const meta = parseFrontMatter(readFileSync(new URL(file, dir), 'utf8'));
      expect(meta.title, file).not.toMatch(/^['"]/);
      expect(meta.tags.length, file).toBeGreaterThan(0);
    }
  });
});

describe('tags', () => {
  it('makes LinkedIn hashtags', () => {
    expect(hashtags(['offline-first', 'Android', '--'])).toEqual(['#offlinefirst', '#android']);
  });

  it('keeps at most 4 dev.to tags, letters and digits only', () => {
    expect(
      devtoTags(['offline-first', 'kotlin-multiplatform', 'android', 'ios', 'privacy']),
    ).toEqual(['offlinefirst', 'kotlinmultiplatform', 'android', 'ios']);
  });
});
