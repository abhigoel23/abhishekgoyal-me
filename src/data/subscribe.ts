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
