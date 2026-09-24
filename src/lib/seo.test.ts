import { describe, expect, it } from 'vitest';
import {
  absoluteUrls,
  feedHtml,
  blogPostingJsonLd,
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

describe('blogPostingJsonLd', () => {
  it('describes a post, falling back to pubDate when there is no update', () => {
    const post = blogPostingJsonLd({
      title: 'Offline-first sync, the hard parts',
      description: 'Notes from building Pulse.',
      pubDate: new Date('2026-01-15T00:00:00.000Z'),
      tags: ['Android', 'Offline-first'],
      image: 'https://abhishekgoyal.me/og/writing/pulse-sync.png',
      url: 'https://abhishekgoyal.me/writing/pulse-sync',
    });
    expect(post).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'Offline-first sync, the hard parts',
      datePublished: '2026-01-15T00:00:00.000Z',
      dateModified: '2026-01-15T00:00:00.000Z',
      author: { '@id': 'https://abhishekgoyal.me/#person' },
      keywords: 'Android, Offline-first',
      mainEntityOfPage: 'https://abhishekgoyal.me/writing/pulse-sync',
      url: 'https://abhishekgoyal.me/writing/pulse-sync',
    });
  });

  it('uses updatedDate for dateModified when set', () => {
    const post = blogPostingJsonLd({
      title: 'Title',
      description: 'Description.',
      pubDate: new Date('2026-01-01T00:00:00.000Z'),
      updatedDate: new Date('2026-02-01T00:00:00.000Z'),
      tags: [],
      image: 'https://abhishekgoyal.me/og/writing/title.png',
      url: 'https://abhishekgoyal.me/writing/title',
    });
    expect(post.dateModified).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('absoluteUrls', () => {
  it('makes root-relative href, src and srcset URLs absolute', () => {
    const html =
      '<a href="/work/pulse">x</a><img src="/_astro/a.webp" srcset="/_astro/a.webp 480w, /_astro/b.webp 768w">';
    expect(absoluteUrls(html)).toBe(
      '<a href="https://abhishekgoyal.me/work/pulse">x</a><img src="https://abhishekgoyal.me/_astro/a.webp" srcset="https://abhishekgoyal.me/_astro/a.webp 480w, https://abhishekgoyal.me/_astro/b.webp 768w">',
    );
  });

  it('leaves absolute, protocol-relative, anchor and mailto URLs alone', () => {
    const html =
      '<a href="https://x.dev/">a</a><a href="//cdn.x/y">b</a><a href="#top">c</a><a href="mailto:a@b.c">d</a>';
    expect(absoluteUrls(html)).toBe(html);
  });
});

describe('feedHtml', () => {
  it('drops inline styles and makes URLs absolute', () => {
    expect(
      feedHtml(
        '<pre class="shiki" style="--shiki-light:#000"><a href="/rss.xml" style="color:red">x</a></pre>',
      ),
    ).toBe('<pre class="shiki"><a href="https://abhishekgoyal.me/rss.xml">x</a></pre>');
  });
});
