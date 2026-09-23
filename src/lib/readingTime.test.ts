import { describe, expect, it } from 'vitest';
import { readingTime } from './readingTime';

describe('readingTime', () => {
  it('rounds up to the nearest minute', () => {
    const words = Array.from({ length: 231 }, () => 'word').join(' ');
    expect(readingTime(words)).toBe(2);
  });

  it('returns a minimum of 1 minute for short text', () => {
    expect(readingTime('a few words')).toBe(1);
  });

  it('returns 1 minute for empty text', () => {
    expect(readingTime('')).toBe(1);
  });

  it('ignores MDX import and export lines', () => {
    const text = `import Foo from '../components/Foo.astro';\nexport const bar = 1;\n${'word '.repeat(230).trim()}`;
    expect(readingTime(text)).toBe(1);
  });

  it('counts exactly 230 words as 1 minute', () => {
    const words = Array.from({ length: 230 }, () => 'word').join(' ');
    expect(readingTime(words)).toBe(1);
  });
});
