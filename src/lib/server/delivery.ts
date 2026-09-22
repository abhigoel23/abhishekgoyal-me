// Wires the delivery steps to their integrations for the queue consumer (src/worker.ts). Each step reads
// only the config it needs, so a missing secret fails that step alone.
import type { AlertTransport } from './alert';
import { sender } from '../../data/emails';
import { getAccessToken, SHEETS_SCOPE } from './googleAuth';
import { alertText, notificationSteps, sendEmail, sendTelegram } from './notifications';
import type { StepHandlers } from './outbox';
import { appendLead } from './sheets';

export type LeadMessage = { kind: 'lead'; id: string };

export function leadHandlers(env: Env): StepHandlers {
  return {
    sheets: async (lead) => {
      if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_KEY || !env.SHEET_ID) {
        throw new Error('Sheets not configured (GOOGLE_SA_EMAIL, GOOGLE_SA_KEY, SHEET_ID)');
      }
      const token = await getAccessToken(
        { email: env.GOOGLE_SA_EMAIL, privateKeyPem: env.GOOGLE_SA_KEY },
        SHEETS_SCOPE,
      );
      await appendLead(token, env.SHEET_ID, lead);
      return 'done';
    },
    ...notificationSteps(env),
    // ga: #62
  };
}

/** Where operational alerts go besides Workers Logs: email and Telegram, whichever is configured. */
export function alertTransports(env: Env): AlertTransport[] {
  const environment = env.ENVIRONMENT || 'local';
  const transports: AlertTransport[] = [];
  if (env.RESEND_API_KEY) {
    const key = env.RESEND_API_KEY;
    transports.push((alert) =>
      sendEmail(
        key,
        {
          from: sender.notifyFrom,
          to: sender.inbox,
          subject: alertText(alert, environment).split('\n')[0]!,
          text: alert.lines.join('\n'),
        },
        // One email per distinct alert per day, even if the cron or DLQ fires again.
        `alert:${alert.subject}:${new Date().toISOString().slice(0, 10)}`,
      ),
    );
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const [token, chat] = [env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID];
    transports.push((alert) => sendTelegram(token, chat, alertText(alert, environment)));
  }
  return transports;
}
