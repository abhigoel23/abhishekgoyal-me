// `pnpm ship <issue#> "<type: subject>"`: commit, push, open the PR (Closes #issue) and wait on the
// required checks only. `pnpm ship:merge <pr#>`: squash-merge, delete the branch, back to an up-to-date
// main. Merging stays a separate, deliberate step (docs/RUNBOOK.md → Ship a change).
//
// Commits what's staged; with nothing staged it stages everything (`git add -A`) first.
// Re-running on a branch that already has a PR just commits, pushes and waits again.
// Optional: --trailer "<line>" (repeatable, appended to the commit) and --footer "<text>" (PR body).
import { execFileSync, spawnSync } from 'node:child_process';

const REPO = 'abhigoel23/abhishekgoyal-me';
const BRANCH = /^(feat|fix|chore|content|docs|test)\/[a-z0-9-]+$/;

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  }).trim();
const tryRun = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' });
const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

function parseArgs(argv) {
  const positional = [];
  const trailers = [];
  let footer = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--trailer') trailers.push(argv[++i]);
    else if (argv[i] === '--footer') footer = argv[++i];
    else positional.push(argv[i]);
  }
  return { positional, trailers, footer };
}

function merge(pr) {
  if (!/^\d+$/.test(pr ?? '')) die('Usage: pnpm ship:merge <pr#>');
  execFileSync('gh', ['pr', 'merge', pr, '--squash', '--delete-branch'], { stdio: 'inherit' });
  run('git', ['switch', '-q', 'main']);
  run('git', ['pull', '-q', '--ff-only']);
  // The main run deploys and rolls itself back on a failed smoke test; GitHub emails on failure.
  console.log(`MERGED #${pr}; on main @ ${run('git', ['rev-parse', '--short', 'HEAD'])}`);
}

// Checks register a few seconds after the push; until then `gh pr checks` reports none.
function waitForChecks(url) {
  for (let i = 0; i < 24; i++) {
    const r = tryRun('gh', ['pr', 'checks', url, '--required']);
    if (!/no (required )?checks reported/i.test(r.stderr + r.stdout)) break;
    spawnSync('sleep', ['5']);
  }
  return spawnSync(
    'gh',
    ['pr', 'checks', url, '--required', '--watch', '--fail-fast', '-i', '15'],
    {
      stdio: 'inherit',
    },
  ).status;
}

function failedLogTail(branch, sha) {
  const runs = JSON.parse(
    run('gh', [
      'run',
      'list',
      '-R',
      REPO,
      '--branch',
      branch,
      '--workflow',
      'ci.yml',
      '-L',
      '5',
      '--json',
      'databaseId,headSha',
    ]),
  );
  const id = runs.find((r) => r.headSha === sha)?.databaseId;
  if (!id) return '(no CI run found for this commit)';
  const log = tryRun('gh', ['run', 'view', String(id), '-R', REPO, '--log-failed']).stdout;
  return `Run ${id}:\n${log.split('\n').slice(-60).join('\n')}`;
}

function ship(issue, message, trailers, footer) {
  if (!/^\d+$/.test(issue ?? '') || !message) {
    die('Usage: pnpm ship <issue#> "<type: subject>" [--trailer "<line>"] [--footer "<text>"]');
  }
  const branch = run('git', ['branch', '--show-current']);
  if (!BRANCH.test(branch))
    die(`Refusing to ship from "${branch}": use feat|fix|chore|content|docs|test/<slug>.`);

  if (tryRun('git', ['diff', '--cached', '--quiet']).status === 0) run('git', ['add', '-A']);
  if (tryRun('git', ['diff', '--cached', '--quiet']).status !== 0) {
    console.log(run('git', ['diff', '--cached', '--stat']));
    const msg = trailers.length ? `${message}\n\n${trailers.join('\n')}` : message;
    // The husky hook runs lint-staged (eslint --fix, prettier --write) on the staged files.
    execFileSync('git', ['commit', '-q', '-m', msg], { stdio: 'inherit' });
  }
  if (run('git', ['rev-list', '--count', 'origin/main..HEAD']) === '0')
    die('Nothing to ship: no commits ahead of main.');
  execFileSync('git', ['push', '-q', '-u', 'origin', 'HEAD'], { stdio: 'inherit' });

  let url = tryRun('gh', ['pr', 'view', '--json', 'url', '-q', '.url']).stdout.trim();
  if (!url) {
    const subject = message.split('\n')[0];
    const body = `Closes #${issue}${footer ? `\n\n${footer}` : ''}`;
    url = run('gh', [
      'pr',
      'create',
      '--base',
      'main',
      '--title',
      `${subject} (#${issue})`,
      '--body',
      body,
    ]);
  }
  console.log(`PR ${url}; waiting on required checks…`);

  const sha = run('git', ['rev-parse', 'HEAD']);
  if (waitForChecks(url) === 0) {
    console.log(`READY ${url}  (merge: pnpm ship:merge ${url.split('/').pop()})`);
    return;
  }
  console.error(`FAILED ${url}\n${failedLogTail(branch, sha)}`);
  process.exit(1);
}

const [cmd, ...rest] = process.argv.slice(2);
const { positional, trailers, footer } = parseArgs(rest);
if (cmd === 'merge') merge(positional[0]);
else ship(cmd, positional[0], trailers, footer);
