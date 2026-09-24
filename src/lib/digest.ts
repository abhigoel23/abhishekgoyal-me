// The newsletter digest behind `pnpm digest` (scripts/digest.mjs): a Markdown draft to paste into
// Resend → Broadcasts. Sent only when there's something new, at most once a month (docs/GROWTH.md).
// No imports: Node loads this directly.

export type DigestPost = { title: string; description: string; url: string };

/** Resend replaces this with each contact's own unsubscribe link (docs/RUNBOOK.md → Sending a note). */
export const UNSUBSCRIBE_PLACEHOLDER = '{{{RESEND_UNSUBSCRIBE_URL}}}';

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

export function digestDraft(input: {
  posts: DigestPost[];
  checklistUrl: string;
  siteUrl: string;
  first: boolean;
}): { subject: string; body: string } {
  const { posts, checklistUrl, siteUrl, first } = input;
  const subject =
    posts.length === 1
      ? `New post: ${posts[0]!.title}`
      : `${posts.length} new posts, and what I'm building`;
  const intro = first
    ? `This is the first note since you signed up for the checklist. Thank you for confirming.`
    : `Here's what's new since my last note.`;
  const body = [
    'Hi,',
    '',
    intro,
    '',
    ...(posts.length ? ['## New on the site', ''] : []),
    ...posts.flatMap((p) => [`**[${p.title}](${p.url})**`, '', p.description, '']),
    "## What I'm building",
    '',
    `${WRITE_THIS}: two or three sentences, in your own words, on what you're working on. Every claim has to match the resume.`,
    '',
    '---',
    '',
    `The [Offline-first Android launch checklist](${checklistUrl}) is always there if you need it again. More at [abhishekgoyal.me](${siteUrl}).`,
    '',
    'Abhishek',
    '',
    `You're getting this because you signed up for the checklist at abhishekgoyal.me. [Unsubscribe](${UNSUBSCRIBE_PLACEHOLDER}), or reply UNSUBSCRIBE.`,
  ].join('\n');
  return { subject, body };
}
