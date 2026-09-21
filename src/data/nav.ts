// Primary navigation. Routes land in M2; the header renders whatever is listed here.
export const nav = [
  { href: '/work', label: 'Work' },
  { href: '/services', label: 'Services' },
  { href: '/writing', label: 'Writing' },
  { href: '/about', label: 'About' },
] as const;

// Until the M3 lead form ships at /contact, the primary CTA opens an email.
export const primaryCta = {
  href: 'mailto:contact@abhishekgoyal.me?subject=Project%20enquiry',
  label: 'Start a project',
} as const;
export const hireCta = { href: '/hire', label: 'Hiring full-time?' } as const;
