// `pnpm digest [YYYY-MM-DD]`: writes the newsletter note newsletter/<today>.html (docs/RUNBOOK.md →
// Sending a note). Pass the date of the last note; posts published after it and up to today are included.
// With no date, every published post is included (the first note). It sends nothing: the Send newsletter
// workflow does, once the note is merged.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { profile } from '../src/data/profile.ts';
import { sharePlatforms } from '../src/data/share.ts';
import { digestDraft, isDay, noteFile, postsToSend, WRITE_THIS } from '../src/lib/digest.ts';
import { campaignUrl, parseFrontMatter } from '../src/lib/share.ts';

const since = process.argv[2];
if (since !== undefined && !isDay(since)) {
  console.error('Usage: pnpm digest [YYYY-MM-DD]  (the date of the last note)');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const { utmSource: source, utmMedium: medium } = sharePlatforms.newsletter;
const campaign = `digest-${today}`;
const link = (path) => campaignUrl(`${profile.url}${path}`, { source, medium, campaign });

const dir = fileURLToPath(new URL('../src/content/writing/', import.meta.url));
const all = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => ({
    slug: f.slice(0, -'.mdx'.length),
    ...parseFrontMatter(readFileSync(dir + f, 'utf8')),
  }));
const posts = postsToSend(all, since, today);

if (!posts.length) {
  console.error(`Nothing published since ${since ?? 'the start'}, so no note this time.`);
  process.exit(1);
}

const { subject, html } = digestDraft({
  posts: posts.map((p) => ({
    title: p.title,
    description: p.description,
    url: link(`/writing/${p.slug}`),
  })),
  checklistUrl: link('/checklist'),
  siteUrl: link('/'),
  first: since === undefined,
});

const out = new URL(`../newsletter/${today}.html`, import.meta.url);
if (existsSync(out)) {
  console.error(`newsletter/${today}.html already exists; edit that one instead.`);
  process.exit(1);
}
mkdirSync(new URL('../newsletter/', import.meta.url), { recursive: true });
writeFileSync(out, noteFile(subject, html));
console.log(`Wrote newsletter/${today}.html (${posts.length} post(s)): ${subject}`);
console.log(`Replace "${WRITE_THIS}", then open a PR. Send with the Send newsletter workflow.`);
