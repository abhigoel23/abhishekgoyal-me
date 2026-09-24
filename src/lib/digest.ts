// The newsletter digest behind `pnpm digest` (scripts/digest.mjs): an HTML draft to paste into the code
// view of Resend → Broadcasts. Sent only when there's something new, at most once a month (docs/GROWTH.md).
// No imports: Node loads this directly.

export type DigestPost = { title: string; description: string; url: string };

/** Marks the part Abhishek writes himself; `pnpm digest` warns while it's still in the draft. */
export const WRITE_THIS = '✍️ WRITE THIS';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(value: string): boolean {
  return DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Posts after the last note (exclusive) up to today (inclusive); a future-dated post isn't live yet. */
export function postsToSend<T extends { pubDate: string; draft: boolean }>(
  posts: T[],
  since: string | undefined,
  today: string,
): T[] {
  return posts
    .filter((p) => !p.draft && p.pubDate <= today && (!since || p.pubDate > since))
    .sort((a, b) => a.pubDate.localeCompare(b.pubDate));
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const a = (href: string, text: string) => `<a href="${escape(href)}">${escape(text)}</a>`;

/**
 * Subject and HTML for Resend's editor. Pasted Markdown loses its links there, so this goes into the
 * editor's code (HTML) view instead.
 */
export function digestDraft(input: {
  posts: DigestPost[];
  checklistUrl: string;
  siteUrl: string;
  first: boolean;
}): { subject: string; html: string } {
  const { posts, checklistUrl, siteUrl, first } = input;
  const subject =
    posts.length === 1
      ? `New post: ${posts[0]!.title}`
      : `${posts.length} new posts, and what I'm building`;
  const intro = first
    ? 'This is the first note since you signed up for the checklist. Thank you for confirming.'
    : 'Here’s what’s new since my last note.';
  const html = [
    '<p>Hi,</p>',
    `<p>${intro}</p>`,
    ...(posts.length ? ['<h2>New on the site</h2>'] : []),
    ...posts.map((p) => `<p><strong>${a(p.url, p.title)}</strong><br>${escape(p.description)}</p>`),
    '<h2>What I’m building</h2>',
    `<p>${WRITE_THIS}: two or three sentences, in your own words, on what you’re working on. Every claim has to match the resume.</p>`,
    '<hr>',
    `<p>The ${a(checklistUrl, 'Offline-first Android launch checklist')} is always there if you need it again. More at ${a(siteUrl, 'abhishekgoyal.me')}.</p>`,
    '<p>Abhishek</p>',
    // "Unsubscribe" is plain text on purpose: Resend's editor drops a pasted link to
    // {{{RESEND_UNSUBSCRIBE_URL}}}, so Abhishek links the word with the editor's link button (RUNBOOK).
    '<p><small>You’re getting this because you signed up for the checklist at abhishekgoyal.me. Unsubscribe, or reply UNSUBSCRIBE.</small></p>',
  ].join('\n');
  return { subject, html };
}
