// Every page the site builds, for e2e tests that must cover all of them: static pages from the registry
// plus one per case study and published post. (Collections can't be imported here, so entries come from
// their files.)
import { readdirSync, readFileSync } from 'node:fs';
import { pages } from '../../src/data/pages';

const entries = (dir: string) => readdirSync(dir).filter((file) => file.endsWith('.mdx'));

// Drafts aren't built in production. If this check ever misreads a post, its page 404s and the tests
// fail visibly, so a simple front-matter match is enough here.
const isDraft = (file: string) =>
  /^draft:\s*true\s*$/m.test(
    readFileSync(`src/content/writing/${file}`, 'utf8').split('---')[1] ?? '',
  );

export const routes = [
  ...Object.keys(pages),
  ...entries('src/content/work').map((file) => `/work/${file.replace(/\.mdx$/, '')}`),
  ...entries('src/content/writing')
    .filter((file) => !isDraft(file))
    .map((file) => `/writing/${file.replace(/\.mdx$/, '')}`),
];
