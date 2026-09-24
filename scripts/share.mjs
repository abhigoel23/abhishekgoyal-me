// `pnpm share <slug>`: the links and a starting LinkedIn post for cross-posting a live post
// (docs/CONTENT.md → Cross-posting). Prints only; it posts nothing anywhere.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sharePlatforms } from '../src/data/share.ts';
import { campaignUrl, devtoTags, hashtags, parseFrontMatter } from '../src/lib/share.ts';
import { profile } from '../src/data/profile.ts';

const dir = fileURLToPath(new URL('../src/content/writing/', import.meta.url));
const slugs = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => f.slice(0, -'.mdx'.length));

const slug = process.argv[2];
if (!slug || !slugs.includes(slug)) {
  console.error(`Usage: pnpm share <slug>\nPosts: ${slugs.join(', ')}`);
  process.exit(1);
}

const post = parseFrontMatter(readFileSync(`${dir}${slug}.mdx`, 'utf8'));
if (post.draft) {
  console.error(`${slug} is a draft (draft: true). Publish it on the site first.`);
  process.exit(1);
}

const canonical = `${profile.url}/writing/${slug}`;
const link = (p) =>
  campaignUrl(canonical, { source: p.utmSource, medium: p.utmMedium, campaign: slug });
const { linkedin, devto } = sharePlatforms;

console.log(`${post.title}

Canonical URL (the site is always the original): ${canonical}
Check it's live first. The production deploy must have finished.

── ${linkedin.name} ─────────────────────────────────────────
LinkedIn has no canonical URL, so post a short summary and the link, never the full text.
Rewrite the summary in your own words. Keep every claim to what the post says.

${post.title}

${post.description}

${link(linkedin)}

${hashtags(post.tags).join(' ')}

── ${devto.name} ───────────────────────────────────────────
The RSS import creates a draft with the canonical URL already set.
1. Open https://dev.to/dashboard and find the imported draft.
2. Check that the canonical URL in the post options is ${canonical}
3. Check code blocks and images, then add the tags: ${devtoTags(post.tags).join(', ')}
4. End the post with:
   *Originally published on [abhishekgoyal.me](${link(devto)}).*
5. Publish.`);
