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

/** Where the build puts a page's share image: / → /og/index.png, /work/pulse → /og/work/pulse.png */
export function ogImagePath(pathname: string): string {
  const path = new URL(canonicalUrl(pathname)).pathname;
  return `/og/${path === '/' ? 'index' : path.slice(1)}.png`;
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

export function faqJsonLd(faqs: readonly { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function professionalServiceJsonLd(services: readonly { title: string; summary: string }[]) {
  return {
    '@type': 'ProfessionalService',
    '@id': `${SITE_URL}/services#service`,
    name: `${profile.name} — mobile engineering`,
    url: `${SITE_URL}/services`,
    description: profile.positioning,
    founder: { '@id': PERSON_ID },
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city,
      addressCountry: 'IN',
    },
    areaServed: 'Worldwide',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: service.title, description: service.summary },
      })),
    },
  };
}

/** One service's own page (/services/<id>), provided by the person and listed in the /services catalog. */
export function serviceJsonLd(service: { id: string; title: string; summary: string }) {
  return {
    '@type': 'Service',
    name: service.title,
    description: service.summary,
    url: `${SITE_URL}/services/${service.id}`,
    provider: { '@id': PERSON_ID },
    areaServed: 'Worldwide',
  };
}

export function blogPostingJsonLd(post: {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  tags: readonly string[];
  image: string;
  url: string;
}) {
  return {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.pubDate.toISOString(),
    dateModified: (post.updatedDate ?? post.pubDate).toISOString(),
    author: { '@id': PERSON_ID },
    image: post.image,
    mainEntityOfPage: post.url,
    keywords: post.tags.join(', '),
    url: post.url,
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

/**
 * Makes root-relative URLs in rendered HTML absolute (href, src and every srcset candidate), for HTML
 * shown off-site such as RSS content: a feed reader would resolve "/work" against its own origin.
 */
/**
 * Post HTML for the feed: absolute URLs, and no inline `style` attributes (the syntax highlighter's
 * colours), which feed readers strip anyway and the W3C validator flags.
 */
export function feedHtml(html: string): string {
  return absoluteUrls(html).replace(/\sstyle="[^"]*"/g, '');
}

export function absoluteUrls(html: string): string {
  const abs = (url: string) =>
    url.startsWith('/') && !url.startsWith('//') ? SITE_URL + url : url;
  return html
    .replace(/\b(href|src)="([^"]*)"/g, (_, attr: string, url: string) => `${attr}="${abs(url)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (_, set: string) => {
      const candidates = set.split(',').map((c) => c.trim().replace(/^\S+/, abs));
      return `srcset="${candidates.join(', ')}"`;
    });
}
