// Reading time estimate for an MDX post body: words ÷ 230wpm, rounded up, minimum 1 minute.

const WORDS_PER_MINUTE = 230;

/** Strips MDX import/export lines before counting words, so component wiring isn't counted as prose. */
function stripImportsAndExports(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*(import|export)\s/.test(line))
    .join('\n');
}

export function readingTime(text: string): number {
  const body = stripImportsAndExports(text);
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
