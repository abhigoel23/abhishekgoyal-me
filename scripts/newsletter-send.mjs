// Sends newsletter/<NOTE>.html to the TARGET segment (test | production) through Resend's Broadcast API.
// Run by .github/workflows/send-newsletter.yml, which also checks production follows a test send.
// Needs RESEND_BROADCAST_KEY (a full-access Resend key). Logs only the broadcast ID: the repo is public.
import { readFileSync } from 'node:fs';
import { newsletter } from '../src/data/newsletter.ts';
import { isDay, noteProblems, parseNote } from '../src/lib/digest.ts';

const { NOTE: note = '', TARGET: target = '', RESEND_BROADCAST_KEY: key } = process.env;

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};

if (!isDay(note)) fail(`NOTE must be a date, YYYY-MM-DD, got "${note}"`);
if (!Object.hasOwn(newsletter.segments, target)) fail(`TARGET must be test or production`);
if (!key) fail('RESEND_BROADCAST_KEY is not set');

let file;
try {
  file = readFileSync(new URL(`../newsletter/${note}.html`, import.meta.url), 'utf8');
} catch {
  fail(`newsletter/${note}.html doesn't exist on this branch`);
}
const { subject, html } = parseNote(file);
const problems = noteProblems({ subject, html });
if (problems.length) fail(`Not sending:\n- ${problems.join('\n- ')}`);

const res = await fetch('https://api.resend.com/broadcasts', {
  method: 'POST',
  headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    segment_id: newsletter.segments[target],
    from: newsletter.from,
    reply_to: newsletter.replyTo,
    subject: target === 'test' ? `[TEST] ${subject}` : subject,
    html,
    name: `Note ${note} (${target})`,
    send: true,
  }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) fail(`Resend ${res.status}: ${body.message ?? body.name ?? 'no message'}`);
console.log(`Sent note ${note} to the ${target} segment: broadcast ${body.id}`);
