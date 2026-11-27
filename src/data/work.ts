// /work page copy. Entries are grouped by their `kind` (src/content.config.ts), in this order.
export const workCopy = {
  eyebrow: 'Case studies',
  title: 'Mobile products, taken from zero to shipped',
  intro:
    'Client apps where I owned the mobile side end to end: architecture, the app itself and the release. Then my own product, and a coded prototype.',
  sections: [
    {
      kind: 'client',
      id: 'client-work',
      title: 'Client work',
      intro: 'Built for companies, from founding engineer to contract Android lead.',
    },
    {
      kind: 'product',
      id: 'own-products',
      title: 'Own products',
      intro: 'Products I designed, built and published myself.',
    },
    {
      kind: 'prototype',
      id: 'prototypes',
      title: 'Prototypes',
      intro: 'Coded prototypes that test an idea on real devices.',
    },
  ],
} as const;
