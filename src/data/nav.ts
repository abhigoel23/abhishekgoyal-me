// Primary navigation: the header and footer render whatever is listed here, so every entry must be a
// route that exists (tests/e2e/nav.spec.ts checks it).
export const nav = [
  { href: '/work', label: 'Work' },
  { href: '/services', label: 'Services' },
  { href: '/writing', label: 'Writing' },
  { href: '/about', label: 'About' },
] as const;

export const primaryCta = { href: '/contact', label: 'Start a project' } as const;
export const hireCta = { href: '/hire', label: 'Hiring full-time?' } as const;
