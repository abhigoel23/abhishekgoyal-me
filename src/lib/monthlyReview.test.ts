import { describe, expect, it } from 'vitest';
import { MONTHLY_HEADERS } from './server/monthly';
import { isMonth, lastMonth, monthName, reviewBody, reviewTitle } from './monthlyReview';

const REPO = 'abhigoel23/abhishekgoyal-me';
/** The skipped-posts search query, decoded. */
const skippedQuery = (body: string) => decodeURIComponent(/issues\?q=([^)]+)\)/.exec(body)![1]!);

describe('month helpers', () => {
  it('validates YYYY-MM', () => {
    expect(isMonth('2026-10')).toBe(true);
    for (const bad of ['2026-13', '2026-1', '26-10', '2026-10; rm -rf', '']) {
      expect(isMonth(bad), bad).toBe(false);
    }
  });

  it('gives last month in UTC, across the year', () => {
    expect(lastMonth(new Date('2026-11-01T04:30:00Z'))).toBe('2026-10');
    expect(lastMonth(new Date('2027-01-01T04:30:00Z'))).toBe('2026-12');
  });

  it('names the month', () => {
    expect(monthName('2026-10')).toBe('October 2026');
    expect(reviewTitle('2026-10')).toBe('Monthly review 2026-10');
  });
});

describe('reviewBody', () => {
  it('lists the month’s posts and the sitemap count', () => {
    const body = reviewBody(
      '2026-10',
      [{ title: 'Post A', url: 'https://abhishekgoyal.me/writing/a' }],
      REPO,
      12,
    );
    expect(body).toContain('**October 2026**');
    expect(body).toContain('(target: one every 2 weeks): 1');
    expect(body).toContain('- [Post A](https://abhishekgoyal.me/writing/a)');
    expect(body).toContain('**Sitemap URLs**: 12');
    expect(body).toContain('row `2026-10`');
    expect(skippedQuery(body)).toContain('closed:2026-10-01..2026-10-31');
  });

  it('says so when nothing was published', () => {
    const body = reviewBody('2026-10', [], REPO);
    expect(body).toContain('- None this month.');
    expect(body).not.toContain('Sitemap URLs');
    expect(skippedQuery(reviewBody('2027-02', [], REPO))).toContain(
      'closed:2027-02-01..2027-02-28',
    );
  });

  it('lists each service page with its target query', () => {
    const body = reviewBody('2026-10', [], REPO, undefined, [
      { url: 'https://abhishekgoyal.me/services/kmp', query: 'is kotlin multiplatform worth it' },
    ]);
    expect(body).toContain('URLs containing `/services/`');
    expect(body).toContain(
      '  - https://abhishekgoyal.me/services/kmp (written for “is kotlin multiplatform worth it”)',
    );
    expect(body).toContain("each post's primary query in docs/SEO.md");
  });

  it('points the conversion formula at the right Monthly columns', () => {
    const column = (header: string) => String.fromCharCode(65 + MONTHLY_HEADERS.indexOf(header));
    expect(column('Leads')).toBe('B');
    expect(column('Visits (CF Web Analytics)')).toBe('M');
    expect(reviewBody('2026-10', [], REPO)).toContain('`=B3/M3`');
  });
});
