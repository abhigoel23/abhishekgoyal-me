// Every page the site builds, for e2e tests that must cover all of them: static pages from the registry
// plus one per case study. (Collections can't be imported here, so case studies come from their files.)
import { readdirSync } from 'node:fs';
import { pages } from '../../src/data/pages';

export const routes = [
  ...Object.keys(pages),
  ...readdirSync('src/content/work')
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => `/work/${file.replace(/\.mdx$/, '')}`),
];
