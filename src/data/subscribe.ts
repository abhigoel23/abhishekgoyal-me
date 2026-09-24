// Copy for /subscribe/confirm, the double opt-in page (#109). The emailed link lands here; nothing is
// confirmed until the visitor presses the button.
export const confirmCopy = {
  eyebrow: 'One more step',
  heading: 'Confirm your email',
  lead: 'Press the button to confirm this address, and the checklist is on its way to your inbox.',
  button: 'Confirm my email',
  working: 'Confirming…',
  done: {
    heading: "You're confirmed",
    body: 'Thanks. The checklist is on its way to your inbox; it can take a few minutes to arrive.',
  },
  invalid: {
    heading: 'This link has expired or was already used',
    body: 'Links work once, for 7 days. If you still want the checklist, sign up again and I will send a new link.',
    link: { label: 'Get the checklist', href: '/checklist' },
  },
  error: 'Something went wrong on my side. Please try again in a minute.',
  noscript:
    'This page needs JavaScript to confirm your email. Please enable it and reload the page.',
} as const;

// Copy for the sign-up form (src/components/react/NewsletterForm.tsx): on /checklist, and as the
// "Just following along" path of the /contact form.
export const newsletterCopy = {
  labels: {
    email: 'Email',
    honeypot: 'Leave this empty',
  },
  // Rendered as: `{consentPrefix}` + a link labelled `{consentLinkText}` + `.`
  consentPrefix:
    'Email me the checklist and the occasional note from Abhishek. I can unsubscribe anytime. See the ',
  consentLinkText: 'privacy policy',
  submit: 'Email me the checklist',
  submitting: 'Sending…',
  success: {
    heading: 'Check your inbox to confirm',
    body: "I've sent a confirmation link to {email}. Open it and press Confirm, and the checklist is on its way. It can take a few minutes; check spam if it doesn't show up.",
  },
  errors: {
    rateLimited: 'Too many attempts, try again in a minute.',
    unavailable: "Sign-up isn't available right now. Please try again later.",
    rejected: "That sign-up couldn't be sent. Please try again.",
    verificationFailed: 'Verification failed, please try again.',
    generic: 'Something went wrong. Please try again in a minute.',
  },
  noscript: 'This form needs JavaScript. Please enable it and reload the page.',
} as const;

// The "Just following along" path on /contact: what it offers, above the email field.
export const followingCopy =
  "No project or role right now? Get the free Offline-first Android launch checklist by email, plus the occasional note on what I'm building.";
