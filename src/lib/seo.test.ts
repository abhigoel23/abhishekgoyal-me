import { describe, expect, it } from 'vitest';
import {
  canonicalUrl,
  faqJsonLd,
  jsonLdGraph,
  ogImagePath,
  pageTitle,
  personJsonLd,
  professionalServiceJsonLd,
  serializeJsonLd,
} from './seo';

describe('pageTitle', () => {
  it('appends the name to page titles', () => {
    expect(pageTitle('Services')).toBe('Services · Abhishek Goyal');
  });

  it('leaves titles that already carry the name alone', () => {
    expect(pageTitle('Abhishek Goyal — Founding Mobile Engineer')).toBe(
      'Abhishek Goyal — Founding Mobile Engineer',
    );
  });
});

describe('canonicalUrl', () => {
  it.each([
    ['/', 'https://abhishekgoyal.me/'],
    ['', 'https://abhishekgoyal.me/'],
    ['/index.html', 'https://abhishekgoyal.me/'],
    ['/services', 'https://abhishekgoyal.me/services'],
    ['/services/', 'https://abhishekgoyal.me/services'],
    ['/services.html', 'https://abhishekgoyal.me/services'],
    ['/work/helperbook', 'https://abhishekgoyal.me/work/helperbook'],
  ])('%s → %s', (path, expected) => {
    expect(canonicalUrl(path)).toBe(expected);
  });
});

describe('ogImagePath', () => {
  it.each([
    ['/', '/og/index.png'],
    ['/styleguide', '/og/styleguide.png'],
    ['/work/helperbook/', '/og/work/helperbook.png'],
    ['/services.html', '/og/services.png'],
  ])('%s → %s', (path, expected) => {
    expect(ogImagePath(path)).toBe(expected);
  });
});

describe('JSON-LD', () => {
  it('describes the person from profile.ts', () => {
    const person = personJsonLd();
    expect(person.name).toBe('Abhishek Goyal');
    expect(person.address.addressLocality).toBe('Gurugram');
    expect(person.sameAs.every((url) => url.startsWith('https://'))).toBe(true);
  });

  it('links the website to the person', () => {
    const graph = jsonLdGraph()['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual(['WebSite', 'Person']);
  });

  it('escapes < so data cannot break out of the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});

describe('services JSON-LD', () => {
  it('maps FAQs to Question/Answer pairs', () => {
    const faq = faqJsonLd([{ question: 'Q?', answer: 'A.' }]);
    expect(faq.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Q?',
      acceptedAnswer: { '@type': 'Answer', text: 'A.' },
    });
  });

  it('lists each service as an offer and links the founder', () => {
    const service = professionalServiceJsonLd([{ title: 'MVP build', summary: 'Idea to store.' }]);
    expect(service.founder['@id']).toBe('https://abhishekgoyal.me/#person');
    expect(service.hasOfferCatalog.itemListElement[0].itemOffered.name).toBe('MVP build');
  });
});
