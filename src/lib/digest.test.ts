import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newsletter } from '../data/newsletter';
import {
  digestDraft,
  isDay,
  noteFile,
  noteProblems,
  parseNote,
  postsToSend,
  UNSUBSCRIBE_PLACEHOLDER,
  WRITE_THIS,
} from './digest';

const post = (pubDate: string, draft = false) => ({ pubDate, draft, title: pubDate });

describe('postsToSend', () => {
  const posts = [
    post('2026-10-08'),
    post('2026-09-24'),
    post('2026-09-30', true),
    post('2026-11-05'),
  ];

  it('sends everything published so far for the first note', () => {
    expect(postsToSend(posts, undefined, '2026-10-08').map((p) => p.pubDate)).toEqual([
      '2026-09-24',
      '2026-10-08',
    ]);
  });

  it('leaves out drafts and future-dated posts', () => {
    expect(postsToSend(posts, undefined, '2026-10-07').map((p) => p.pubDate)).toEqual([
      '2026-09-24',
    ]);
  });

  it('only includes posts after the last note', () => {
    expect(postsToSend(posts, '2026-10-08', '2026-11-30').map((p) => p.pubDate)).toEqual([
      '2026-11-05',
    ]);
  });
});

describe('isDay', () => {
  it('accepts real dates only', () => {
    expect(isDay('2026-10-08')).toBe(true);
    for (const bad of ['2026-10-8', '2026-13-01', '08-10-2026', 'yesterday']) {
      expect(isDay(bad), bad).toBe(false);
    }
  });
});

describe('digestDraft', () => {
  const base = {
    checklistUrl: 'https://abhishekgoyal.me/checklist?utm_source=newsletter',
    siteUrl: 'https://abhishekgoyal.me/?utm_source=newsletter',
  };
  const a = { title: 'Post A', description: 'About A.', url: 'https://abhishekgoyal.me/writing/a' };
  const b = { title: 'Post B', description: 'About B.', url: 'https://abhishekgoyal.me/writing/b' };

  it('names a single post in the subject', () => {
    expect(digestDraft({ ...base, posts: [a], first: false }).subject).toBe('New post: Post A');
  });

  it('lists every post with its link and description', () => {
    const { subject, html: body } = digestDraft({ ...base, posts: [a, b], first: true });
    expect(subject).toBe("2 new posts, and what I'm building");
    expect(body).toContain(
      '<strong><a href="https://abhishekgoyal.me/writing/a">Post A</a></strong>',
    );
    expect(body).toContain('About B.');
    expect(body).toContain('first note');
  });

  it('always carries the unsubscribe link, the reply option and the gap to write', () => {
    const { html: body } = digestDraft({ ...base, posts: [a], first: false });
    expect(body).toContain(
      `<a href="${UNSUBSCRIBE_PLACEHOLDER}">Unsubscribe</a>, or reply UNSUBSCRIBE.`,
    );
    expect(body).toContain('reply UNSUBSCRIBE');
    expect(body).toContain(WRITE_THIS);
    expect(body).toContain(base.checklistUrl);
  });

  it('escapes titles and URLs', () => {
    const odd = {
      title: 'A & <B>',
      description: 'x < y',
      url: 'https://abhishekgoyal.me/?a=1&b=2',
    };
    const { html } = digestDraft({ ...base, posts: [odd], first: false });
    expect(html).toContain('href="https://abhishekgoyal.me/?a=1&amp;b=2">A &amp; &lt;B&gt;</a>');
    expect(html).toContain('x &lt; y');
  });
});

describe('note files', () => {
  const base = {
    checklistUrl: 'https://abhishekgoyal.me/checklist',
    siteUrl: 'https://abhishekgoyal.me/',
  };
  const draft = digestDraft({
    ...base,
    posts: [
      { title: 'Post A', description: 'About A.', url: 'https://abhishekgoyal.me/writing/a' },
    ],
    first: true,
  });

  it('round-trips the subject and HTML', () => {
    expect(parseNote(noteFile(draft.subject, draft.html))).toEqual(draft);
  });

  it('rejects a file without the subject line, and a subject that would break it', () => {
    expect(() => parseNote('<p>Hi</p>')).toThrow();
    expect(() => noteFile('a --> b', '<p>Hi</p>')).toThrow();
  });

  it('refuses to send a draft whose gap is still unwritten', () => {
    expect(noteProblems(draft)).toEqual([`"${WRITE_THIS}" is still in the note`]);
  });

  it('is ready once the gap is written', () => {
    const written = {
      ...draft,
      html: draft.html.replace(/<p>✍️ WRITE THIS:[^<]*<\/p>/, '<p>Done.</p>'),
    };
    expect(noteProblems(written)).toEqual([]);
  });

  it('refuses a note without the unsubscribe link or a subject', () => {
    const problems = noteProblems({ subject: '', html: '<p>Hi</p>' });
    expect(problems).toHaveLength(2);
    expect(problems.join()).toContain('unsubscribe');
  });
});

describe('newsletter segments', () => {
  it('match RESEND_SEGMENT_ID in wrangler.jsonc (production, then staging)', () => {
    const config = readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8');
    const ids = [...config.matchAll(/"RESEND_SEGMENT_ID": "([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual([newsletter.segments.production, newsletter.segments.test]);
  });
});
