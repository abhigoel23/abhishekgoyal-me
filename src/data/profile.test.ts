import { describe, expect, it } from 'vitest';
import { profile } from './profile';

describe('profile', () => {
  it('uses the apex domain over https', () => {
    expect(profile.url).toBe('https://abhishekgoyal.me');
  });

  it('only links to https URLs', () => {
    for (const url of Object.values(profile.links)) expect(url).toMatch(/^https:\/\//);
  });
});
