import { describe, expect, it } from 'vitest';
import { brands, colorVars } from './brands';
import { contrast } from './contrast';

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

describe.each(brands)('$name tokens', (brand) => {
  describe.each(['light', 'dark'] as const)('%s', (theme) => {
    const tokens = brand[theme];
    it.each(pairs)('%s on %s ≥ %d:1', (fg, bg, min) => {
      expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
    });
  });
});

describe('colorVars', () => {
  it('kebab-cases token names', () => {
    expect(colorVars(brands[0].light)).toContain('--on-accent:#FFFFFF;');
  });
});
