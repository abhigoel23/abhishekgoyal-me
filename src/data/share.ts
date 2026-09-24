// Where posts are cross-posted, and the UTM values for links shared there (docs/ANALYTICS.md → UTM
// convention). Used by `pnpm share <slug>` (scripts/share.mjs). No imports: Node loads this directly.
export type SharePlatform = {
  name: string;
  utmSource: string;
  utmMedium: string;
};

export const sharePlatforms = {
  linkedin: { name: 'LinkedIn', utmSource: 'linkedin', utmMedium: 'social' },
  devto: { name: 'dev.to', utmSource: 'devto', utmMedium: 'social' },
} as const satisfies Record<string, SharePlatform>;
