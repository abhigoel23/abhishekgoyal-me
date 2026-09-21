import { describe, expect, it } from 'vitest';
import { contrast } from './contrast';
import { colorVars, dark, light, themeCss } from './theme';

// WCAG 2.1 AA: 4.5 for text, 3 for UI components (focus ring). Body ink gets AAA.
const pairs = [
  ['ink', 'bg', 7],
  ['ink', 'surface', 7],
  ['muted', 'bg', 4.5],
  ['muted', 'surface', 4.5],
  ['accent', 'bg', 4.5],
  ['accent', 'surface', 4.5],
  ['onAccent', 'accent', 4.5],
  ['focus', 'bg', 3],
] as const;

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s tokens', (_, tokens) => {
  it.each(pairs)('%s on %s ≥ %d:1', (fg, bg, min) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe('themeCss', () => {
  it('kebab-cases token names', () => {
    expect(colorVars(light)).toContain('--on-accent:#FFFFFF;');
  });

  it('defaults to light and honours an explicit or OS dark preference', () => {
    const css = themeCss();
    expect(css).toContain(`:root{`);
    expect(css).toContain(`:root[data-theme='dark']{${colorVars(dark)}}`);
    expect(css).toContain(`:root:not([data-theme='light'])`);
  });
});
