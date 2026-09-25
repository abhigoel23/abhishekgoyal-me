import { describe, expect, it } from 'vitest';
import { pages } from './pages';
import { profile } from './profile';

// The pages written for search (docs/SEO.md): their snippets must fit in a search result.
const searchPages = ['/', '/work', '/services'] as const;

describe('search-facing page metadata', () => {
  it.each(searchPages)('%s has a description of 160 characters or fewer', (path) => {
    expect(pages[path].description.length).toBeLessThanOrEqual(160);
  });

  it.each(searchPages)('%s has a title that says more than the name', (path) => {
    expect(pages[path].title.replace(profile.name, '').trim().length).toBeGreaterThan(10);
  });
});
