// RSS 2.0 feed of published posts, newest first. Built with @astrojs/rss, not hand-rolled XML.
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import mdxRenderer from '@astrojs/mdx/server.js';
import { render } from 'astro:content';
import { pages } from '../data/pages';
import { profile } from '../data/profile';
import { getPosts } from '../lib/posts';
import { feedHtml, SITE_URL } from '../lib/seo';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: mdxRenderer });

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      // Full post HTML for feed readers. A post that can't render fails the build, like its page would.
      const content = feedHtml(await container.renderToString(Content));
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: `/writing/${post.id}`,
        categories: post.data.tags,
        content,
      };
    }),
  );

  return rss({
    title: `${pages['/writing'].title} — ${profile.name}`,
    description: pages['/writing'].description,
    site: SITE_URL,
    items,
    trailingSlash: false,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    // The feed's own URL, which the W3C validator asks for.
    customData: `<language>en-in</language><atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`,
  });
};
