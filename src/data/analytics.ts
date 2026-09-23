// Google Analytics 4. The IDs are public. gtag loads only on these hosts, and only after the visitor
// accepts (src/components/ConsentBar.astro). The Worker's server-side copy is GA_MEASUREMENT_ID in
// wrangler.jsonc; keep the two in step.
export const GA_MEASUREMENT_ID = 'G-PHG39RRGSZ';

/** The live site. Analytics of any kind run only here, never on previews, staging or localhost. */
export const ANALYTICS_HOSTS = ['abhishekgoyal.me', 'www.abhishekgoyal.me'] as const;

// Cloudflare Web Analytics: cookieless, needs no consent, and counts the visitors GA never sees (the
// ones who decline, and anyone with an ad blocker). The token is public: it ships in the page source.
// Installed here rather than by Cloudflare's automatic injection, which skips Worker-served HTML.
export const CF_BEACON_TOKEN = 'cb74190f341643a0b9cf43114cff4d0f';

// How long an Accept or Decline is remembered before the bar asks again. GA's own cookies expire at
// the same time, so an old consent can't outlive the choice.
export const CONSENT_MAX_AGE_DAYS = 182;

export const consentCopy = {
  label: 'Analytics cookies',
  text: 'Can I use Google Analytics to see which pages are useful? It sets cookies only if you accept.',
  privacy: 'Privacy',
  decline: 'Decline',
  accept: 'Accept',
  settings: 'Cookie settings',
};
