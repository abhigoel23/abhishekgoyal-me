import { describe, expect, it } from 'vitest';
import { digestDraft, isDay, postsToSend, WRITE_THIS } from './digest';

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

  it('always carries the unsubscribe wording, the reply option and the gap to write', () => {
    const { html: body } = digestDraft({ ...base, posts: [a], first: false });
    // The link itself is Resend's Unsubscribe footer block, added in the editor (RUNBOOK).
    expect(body).toContain('Unsubscribe with the link below');
    expect(body).not.toContain('RESEND_UNSUBSCRIBE_URL');
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
