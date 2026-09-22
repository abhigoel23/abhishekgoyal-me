// Primary navigation. Routes land in M2; the header renders whatever is listed here.
export const nav = [
  { href: '/work', label: 'Work' },
  { href: '/services', label: 'Services' },
  { href: '/writing', label: 'Writing' },
  { href: '/about', label: 'About' },
] as const;

export const primaryCta = { href: '/contact', label: 'Start a project' } as const;
export const hireCta = { href: '/hire', label: 'Hiring full-time?' } as const;
