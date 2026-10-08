// Where the Send newsletter workflow sends a note (scripts/newsletter-send.mjs). The segment IDs are the
// same as RESEND_SEGMENT_ID in wrangler.jsonc (a test checks), and aren't secret. No imports: Node loads
// this directly.
export const newsletter = {
  from: 'Abhishek Goyal <contact@abhishekgoyal.me>',
  // People may reply UNSUBSCRIBE (privacy page), so replies must reach the inbox.
  replyTo: 'contact@abhishekgoyal.me',
  segments: {
    /** The staging segment: only Abhishek's own test addresses. */
    test: '934f6d41-a783-450c-a943-d47272baa2cd',
    production: '207cf504-2de6-4e4c-91e0-40da8d93004a',
  },
} as const;

export type NewsletterTarget = keyof typeof newsletter.segments;
