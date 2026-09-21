import { describe, expect, it } from 'vitest';
import { site } from './site';

describe('site', () => {
  it('uses the apex domain over https', () => {
    expect(site.url).toBe('https://abhishekgoyal.me');
  });
});
