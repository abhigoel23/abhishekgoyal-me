// `pnpm digest [YYYY-MM-DD]`: a Markdown draft of the newsletter digest to paste into Resend →
// Broadcasts (docs/RUNBOOK.md → Sending a note). Pass the date of the last note; posts published after it
// and up to today are included. With no date, every published post is included (the first note).
// Prints only; it sends nothing.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { profile } from '../src/data/profile.ts';
import { sharePlatforms } from '../src/data/share.ts';
import { digestDraft, isDay, postsToSend, WRITE_THIS } from '../src/lib/digest.ts';
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

const { subject, body } = digestDraft({
  posts: posts.map((p) => ({
    title: p.title,
    description: p.description,
    url: link(`/writing/${p.slug}`),
  })),
  checklistUrl: link('/checklist'),
  siteUrl: link('/'),
  first: since === undefined,
});

console.log(`Subject: ${subject}\n\n${body}`);
console.error(
  `\n${posts.length} post(s). Replace "${WRITE_THIS}" before sending. Send to a test segment first.`,
);
