// Where posts are cross-posted or sent, and the UTM values for links shared there (docs/ANALYTICS.md → UTM
// convention). Used by `pnpm share <slug>` and `pnpm digest`. No imports: Node loads this directly.
export type SharePlatform = {
  name: string;
  utmSource: string;
  utmMedium: string;
};

export const sharePlatforms = {
  linkedin: { name: 'LinkedIn', utmSource: 'linkedin', utmMedium: 'social' },
  // Posts reach dev.to through its RSS import, which adds its own untagged "Originally published" link.
  // These values are for links added there by hand, e.g. the profile's website URL.
  devto: { name: 'dev.to', utmSource: 'devto', utmMedium: 'social' },
  // The newsletter digest (`pnpm digest`, scripts/digest.mjs), sent from Resend Broadcasts.
  newsletter: { name: 'Newsletter', utmSource: 'newsletter', utmMedium: 'email' },
} as const satisfies Record<string, SharePlatform>;
