import { describe, expect, it } from 'vitest';
import { byNewestFirst, isPublished } from './posts';

describe('isPublished', () => {
  it('excludes drafts in production', () => {
    expect(isPublished({ draft: true }, true)).toBe(false);
  });

  it('includes drafts outside production', () => {
    expect(isPublished({ draft: true }, false)).toBe(true);
  });

  it('includes published posts everywhere', () => {
    expect(isPublished({ draft: false }, true)).toBe(true);
    expect(isPublished({ draft: false }, false)).toBe(true);
  });
});

describe('byNewestFirst', () => {
  it('sorts posts with the newest pubDate first', () => {
    const posts = [
      { data: { pubDate: new Date('2024-01-01') } },
      { data: { pubDate: new Date('2024-06-01') } },
      { data: { pubDate: new Date('2024-03-01') } },
    ];
    expect(posts.sort(byNewestFirst).map((p) => p.data.pubDate.toISOString().slice(0, 10))).toEqual(
      ['2024-06-01', '2024-03-01', '2024-01-01'],
    );
  });
});
