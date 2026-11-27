// Sitemap lastmod (astro.config.mjs), only where the date is real: each post's updatedDate or pubDate, and
// /writing as the newest of them. Other pages get none. CI checks out shallow, so git dates aren't available,
// and a build date on every page would teach Google to ignore lastmod altogether.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The date a post last changed, from its frontmatter. null for drafts and for files without a pubDate.
 * @param {string} source the .mdx file's text
 * @returns {Date | null}
 */
export function postDate(source) {
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
  const field = (/** @type {string} */ name) =>
    new RegExp(`^${name}:\\s*['"]?([^'"\\n]+)`, 'm').exec(frontmatter)?.[1]?.trim();
  if (field('draft') === 'true') return null;
  const value = field('updatedDate') ?? field('pubDate');
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * Map of pathname → lastmod for the posts in `dir` and the /writing index.
 * @param {string} dir src/content/writing
 * @returns {Map<string, Date>}
 */
export function writingLastmod(dir) {
  /** @type {Map<string, Date>} */
  const dates = new Map();
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.mdx'))) {
    const date = postDate(readFileSync(join(dir, file), 'utf8'));
    if (date) dates.set(`/writing/${file.replace(/\.mdx$/, '')}`, date);
  }
  const newest = Math.max(...[...dates.values()].map((date) => date.getTime()));
  if (dates.size > 0) dates.set('/writing', new Date(newest));
  return dates;
}
