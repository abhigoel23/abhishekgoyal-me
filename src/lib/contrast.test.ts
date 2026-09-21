import { describe, expect, it } from 'vitest';
import { contrast, luminance } from './contrast';

describe('contrast', () => {
  it('matches the WCAG extremes', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  it('matches a known pair (#767676 on white is 4.54:1)', () => {
    expect(contrast('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('rejects anything but #rrggbb', () => {
    expect(() => luminance('#fff')).toThrow();
  });
});
