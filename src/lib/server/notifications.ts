// Lead notifications: an email to the inbox, an auto-reply to the visitor (Resend) and a Telegram ping
// with no personal details. Plain-text email only, so nothing a visitor typed can become markup.
import { autoReply, notify, sender, telegram } from '../../data/emails';
import { budgetBands, timelines, workModes } from '../../data/lead';
import type { Alert } from './alert';
import type { LeadRow } from './leadStore';
import type { StepResult } from './outbox';
import { leadFields, optionLabel } from './sheets';

const RESEND_URL = 'https://api.resend.com/emails';
const allBudgets = [...budgetBands.USD, ...budgetBands.INR];

export type Email = {
  from: string;
  to: string;
  subject: string;
  text: string;
  reply_to?: string;
};

/** Resend's Idempotency-Key makes a retried step send at most once (keys last 24 h). */
export async function sendEmail(
  apiKey: string,
  email: Email,
  idempotencyKey: string,
  fetcher: typeof fetch = fetch,
) {
  const res = await fetcher(RESEND_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(email),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
  fetcher: typeof fetch = fetch,
) {
  const res = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  // Never include the URL in errors: it contains the bot token.
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Cheap credential check for the daily health run: getMe sends nothing. */
export async function checkTelegram(token: string, fetcher: typeof fetch = fetch) {
  const res = await fetcher(`https://api.telegram.org/bot${token}/getMe`);
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
}

// Header values must be one line.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();
const firstName = (name: string) => oneLine(name).split(/\s+/)[0]!.slice(0, 50);
const envPrefix = (environment: string) =>
  environment === 'production' ? '' : `[${environment}] `;

export function notifyEmail(lead: LeadRow, environment: string): Email {
  const subject =
    lead.path === 'role'
      ? notify.role(lead.company ?? '', lead.role_title ?? '')
      : notify.project(lead.name ?? '', optionLabel(allBudgets, lead.budget));
  const fields = leadFields(lead).map(([k, v]) => `${k}: ${v}`);
  return {
    from: sender.notifyFrom,
    to: sender.inbox,
    reply_to: lead.email ?? undefined,
    subject: oneLine(envPrefix(environment) + subject),
    text: [notify.intro, '', ...fields].join('\n'),
  };
}

export function autoReplyEmail(lead: LeadRow): Email {
  const first = firstName(lead.name ?? '');
  const copy =
    lead.path === 'role'
      ? autoReply.role(first, oneLine(lead.role_title ?? ''), oneLine(lead.company ?? ''))
      : autoReply.project(first);
  return {
    from: sender.from,
    to: lead.email ?? '',
    reply_to: sender.inbox,
    subject: oneLine(copy.subject),
    text: [...copy.lines, '', ...autoReply.signature, '', ...autoReply.footer].join('\n'),
  };
}

export function telegramText(lead: LeadRow, environment: string) {
  const text =
    lead.path === 'role'
      ? telegram.role(optionLabel(workModes, lead.work_mode))
      : telegram.project(
          optionLabel(allBudgets, lead.budget),
          optionLabel(timelines, lead.timeline),
        );
  return envPrefix(environment) + text;
}

export function alertText(alert: Alert, environment: string) {
  return [envPrefix(environment) + telegram.alert(alert.subject), ...alert.lines].join('\n');
}

// RFC 2606 / 6761 names: test submissions must never be emailed.
const RESERVED = /(^|\.)(example\.(com|net|org)|test|invalid|example|localhost)$/i;
export const isReservedEmail = (email: string) => RESERVED.test(email.split('@')[1] ?? '');

/** True if this address already got an auto-reply for another lead in the last 24 h. */
export async function autoReplySentRecently(db: D1Database, lead: LeadRow, now: Date) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const row = await db
    .prepare(
      `SELECT 1 FROM leads l JOIN outbox_status o
         ON o.ref_kind = 'lead' AND o.ref_id = l.lead_id AND o.step = 'autoreply' AND o.status = 'done'
       WHERE l.email = ? AND l.lead_id != ? AND o.updated_at > ? LIMIT 1`,
    )
    .bind(lead.email, lead.lead_id, since)
    .first();
  return row !== null;
}

type NotifyEnv = Pick<
  Env,
  'ENVIRONMENT' | 'RESEND_API_KEY' | 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID'
> & { DB?: D1Database };

function requireSecret(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

export function notificationSteps(env: NotifyEnv, now: () => Date = () => new Date()) {
  const environment = env.ENVIRONMENT || 'local';
  return {
    notify: async (lead: LeadRow): Promise<StepResult> => {
      const key = requireSecret(env.RESEND_API_KEY, 'RESEND_API_KEY');
      await sendEmail(key, notifyEmail(lead, environment), `${lead.lead_id}:notify`);
      return 'done';
    },
    autoreply: async (lead: LeadRow): Promise<StepResult> => {
      if (!lead.email || isReservedEmail(lead.email)) return 'skipped';
      if (env.DB && (await autoReplySentRecently(env.DB, lead, now()))) return 'skipped';
      const key = requireSecret(env.RESEND_API_KEY, 'RESEND_API_KEY');
      let email = autoReplyEmail(lead);
      // Outside production, never email visitors: send the auto-reply to the inbox for review.
      if (environment !== 'production') {
        email = {
          ...email,
          to: sender.inbox,
          subject: `[${environment} → ${email.to}] ${email.subject}`,
        };
      }
      await sendEmail(key, email, `${lead.lead_id}:autoreply`);
      return 'done';
    },
    telegram: async (lead: LeadRow): Promise<StepResult> => {
      const token = requireSecret(env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN');
      const chat = requireSecret(env.TELEGRAM_CHAT_ID, 'TELEGRAM_CHAT_ID');
      await sendTelegram(token, chat, telegramText(lead, environment));
      return 'done';
    },
  };
}
