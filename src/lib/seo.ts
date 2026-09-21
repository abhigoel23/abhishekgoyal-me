// Pure helpers behind src/components/SEO.astro: titles, canonical URLs and JSON-LD.
import { profile } from '../data/profile';

export const SITE_URL = profile.url;
const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** "Services · Abhishek Goyal"; the home page passes its own full title. */
export function pageTitle(title: string): string {
  return title === profile.name || title.includes(profile.name)
    ? title
    : `${title} · ${profile.name}`;
}

/** Canonical URL on the apex domain: no trailing slash, no .html, no /index. */
export function canonicalUrl(pathname: string): string {
  const path = pathname
    .replace(/\.html$/, '')
    .replace(/(^|\/)index$/, '/')
    .replace(/\/+$/, '');
  return new URL(path || '/', SITE_URL).href;
}

export function personJsonLd() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.name,
    url: SITE_URL,
    jobTitle: profile.jobTitle,
    description: profile.positioning,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city,
      addressCountry: 'IN',
    },
    sameAs: [profile.links.linkedin, profile.links.github],
    knowsAbout: [...profile.knowsAbout],
  };
}

export function websiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: profile.name,
    description: profile.positioning,
    inLanguage: 'en',
    publisher: { '@id': PERSON_ID },
  };
}

/** One @graph with the site-wide entities plus any page-specific ones (BlogPosting, FAQPage… in later milestones). */
export function jsonLdGraph(extra: Record<string, unknown>[] = []) {
  return {
    '@context': 'https://schema.org',
    '@graph': [websiteJsonLd(), personJsonLd(), ...extra],
  };
}

/** JSON for a <script type="application/ld+json">, with `<` escaped so content can never close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
