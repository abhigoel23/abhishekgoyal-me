// Pure helpers behind `pnpm share <slug>` (scripts/share.mjs). No imports: Node loads this directly.

export type PostMeta = { title: string; description: string; tags: string[]; draft: boolean };

/** `url` with utm_source/utm_medium/utm_campaign set, replacing any already there. */
export function campaignUrl(
  url: string,
  utm: { source: string; medium: string; campaign: string },
): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', utm.source);
  u.searchParams.set('utm_medium', utm.medium);
  u.searchParams.set('utm_campaign', utm.campaign);
  return u.toString();
}

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && (v[0] === "'" || v[0] === '"') && v.at(-1) === v[0]) {
    const inner = v.slice(1, -1);
    // YAML escapes a single quote inside single quotes by doubling it.
    return v[0] === "'" ? inner.replaceAll("''", "'") : inner;
  }
  return v;
}

/**
 * The post fields `pnpm share` needs, read from an MDX file's front matter. Handles the one-line forms
 * docs/CONTENT.md prescribes (quoted strings, `tags: [a, b]`), not arbitrary YAML.
 */
export function parseFrontMatter(source: string): PostMeta {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];
  if (!block) throw new Error('No front matter found');
  const fields = new Map<string, string>();
  for (const line of block.split(/\r?\n/)) {
    const m = /^(\w+):\s*(.*)$/.exec(line);
    if (m) fields.set(m[1], m[2]);
  }
  const title = unquote(fields.get('title') ?? '');
  const description = unquote(fields.get('description') ?? '');
  if (!title || !description) throw new Error('Front matter needs a title and a description');
  const tagList = /^\[(.*)\]$/.exec(fields.get('tags')?.trim() ?? '')?.[1] ?? '';
  const tags = tagList
    .split(',')
    .map(unquote)
    .filter((t) => t !== '');
  return { title, description, tags, draft: fields.get('draft')?.trim() === 'true' };
}

/** LinkedIn hashtags: `offline-first` → `#offlinefirst`. */
export function hashtags(tags: string[]): string[] {
  return tags.map((t) => `#${t.replace(/[^a-z0-9]/gi, '').toLowerCase()}`).filter((t) => t !== '#');
}

/** dev.to allows up to 4 tags, lowercase letters and digits only. */
export function devtoTags(tags: string[]): string[] {
  return tags
    .map((t) => t.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .filter((t) => t !== '')
    .slice(0, 4);
}
