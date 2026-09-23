// Blog post helpers behind src/pages/writing/*. Pure predicate/sort kept free of astro:content so
// they can be unit tested without booting Astro (see posts.test.ts).
import type { CollectionEntry } from 'astro:content';

type WritingData = CollectionEntry<'writing'>['data'];

/** Drafts are excluded once the site is built for production. */
export function isPublished(data: Pick<WritingData, 'draft'>, isProd: boolean): boolean {
  return !isProd || !data.draft;
}

/** Newest first, by pubDate. */
export function byNewestFirst<T extends { data: Pick<WritingData, 'pubDate'> }>(
  a: T,
  b: T,
): number {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC', // front-matter dates are UTC midnight; keep the build machine's zone out of it
};

/** e.g. "1 October 2026". */
export const formatPostDate = (date: Date) => date.toLocaleDateString('en-IN', DATE_FORMAT);

/** Published posts, newest first. */
export async function getPosts(): Promise<CollectionEntry<'writing'>[]> {
  const { getCollection } = await import('astro:content');
  const posts = await getCollection('writing', ({ data }) =>
    isPublished(data, import.meta.env.PROD),
  );
  return posts.sort(byNewestFirst);
}
