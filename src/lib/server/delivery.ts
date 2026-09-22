// Wires the delivery steps to their integrations for the queue consumer (src/worker.ts). Each step reads
// only the config it needs, so a missing secret fails that step alone.
import type { AlertTransport } from './alert';
import { sender } from '../../data/emails';
import {
  BOOKING_STEPS,
  bookingTelegramText,
  getBookingEvent,
  type BookingHandlers,
} from './bookings';
import { getAccessToken, SHEETS_SCOPE } from './googleAuth';
import { alertText, notificationSteps, sendEmail, sendTelegram } from './notifications';
import { deliverLead, runSteps, type StepHandlers } from './outbox';
import { appendBooking, appendLead } from './sheets';

export type DeliveryMessage = { kind: 'lead' | 'booking'; id: string };

async function sheetsAccess(env: Env) {
  if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_KEY || !env.SHEET_ID) {
    throw new Error('Sheets not configured (GOOGLE_SA_EMAIL, GOOGLE_SA_KEY, SHEET_ID)');
  }
  const token = await getAccessToken(
    { email: env.GOOGLE_SA_EMAIL, privateKeyPem: env.GOOGLE_SA_KEY },
    SHEETS_SCOPE,
  );
  return { token, sheetId: env.SHEET_ID };
}

export function leadHandlers(env: Env): StepHandlers {
  return {
    sheets: async (lead) => {
      const { token, sheetId } = await sheetsAccess(env);
      await appendLead(token, sheetId, lead);
      return 'done';
    },
    ...notificationSteps(env),
    // ga: #62
  };
}

export function bookingHandlers(env: Env): BookingHandlers {
  return {
    sheets: async (booking) => {
      const { token, sheetId } = await sheetsAccess(env);
      await appendBooking(token, sheetId, booking);
      return 'done';
    },
    telegram: async (booking) => {
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
        throw new Error('Telegram not configured');
      }
      const text = bookingTelegramText(booking, env.ENVIRONMENT || 'local');
      await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, text);
      return 'done';
    },
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

/** Runs the pending steps for one queue message (a lead or a booking event). */
export async function deliver(db: D1Database, message: DeliveryMessage, env: Env) {
  if (message.kind === 'booking') {
    const event = await getBookingEvent(db, message.id);
    return runSteps(db, 'booking', message.id, event, BOOKING_STEPS, bookingHandlers(env));
  }
  return deliverLead(db, message.id, leadHandlers(env));
}
