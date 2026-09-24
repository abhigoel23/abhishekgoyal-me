// Delivery steps for newsletter subscribers: the confirmation email (#109); once confirmed, the Sheet
// row, the Resend segment, the checklist email and GA's sign_up (#110); on unsubscribe, the Sheet's
// Status. Nothing reaches the Sheet, Resend's contacts or GA before the address is confirmed.
import { checklistDelivery, confirmSubscription, sender } from '../../data/emails';
import { checklistPdf } from '../../data/checklist';
import { profile } from '../../data/profile';
import { sendSignUp } from './ga';
import { sheetsAccess } from './googleAuth';
import { isReservedEmail, sendEmail, type Email } from './notifications';
import { runSteps, skip, type Handlers } from './outbox';
import { upsertContact } from './resendContacts';
import { appendSubscriber, setSubscriberStatus } from './sheets';
import {
  getSubscriber,
  hashToken,
  rotateToken,
  SIGNUP_STEPS,
  CONFIRMED_STEPS,
  UNSUBSCRIBE_STEPS,
  type SubscriberRow,
} from './subscriberStore';

export const SUBSCRIBER_STEPS = [
  ...SIGNUP_STEPS,
  ...CONFIRMED_STEPS,
  ...UNSUBSCRIBE_STEPS,
] as const;
export type SubscriberStep = (typeof SUBSCRIBER_STEPS)[number];
export type SubscriberHandlers = Handlers<SubscriberStep, SubscriberRow>;

/**
 * The confirm link. The token sits in the fragment, which browsers never send to a server. `origin` is
 * the environment's own (SITE_ORIGIN), so a staging link reaches staging's D1.
 */
export const confirmLink = (token: string, origin: string = profile.url) =>
  `${origin}/subscribe/confirm#t=${encodeURIComponent(token)}`;

export function confirmationEmail(
  to: string,
  token: string,
  environment: string,
  origin: string = profile.url,
): Email {
  const email: Email = {
    from: sender.from,
    to,
    subject: confirmSubscription.subject,
    text: [
      ...confirmSubscription.lines(confirmLink(token, origin)),
      '',
      ...confirmSubscription.signature,
      '',
      ...confirmSubscription.footer,
    ].join('\n'),
  };
  return forEnvironment(email, environment);
}

// Outside production, never email visitors: send it to the inbox for review (as auto-replies do).
function forEnvironment(email: Email, environment: string): Email {
  if (environment === 'production') return email;
  return { ...email, to: sender.inbox, subject: `[${environment} → ${email.to}] ${email.subject}` };
}

export function checklistEmail(to: string, environment: string): Email {
  return forEnvironment(
    {
      from: sender.from,
      to,
      subject: checklistDelivery.subject,
      text: [
        ...checklistDelivery.lines(`${profile.url}${checklistPdf}`),
        '',
        ...checklistDelivery.signature,
        '',
        ...checklistDelivery.footer,
      ].join('\n'),
    },
    environment,
  );
}

type SubscriberEnv = Pick<
  Env,
  | 'ENVIRONMENT'
  | 'SITE_ORIGIN'
  | 'RESEND_API_KEY'
  | 'RESEND_CONTACTS_KEY'
  | 'RESEND_SEGMENT_ID'
  | 'GOOGLE_SA_EMAIL'
  | 'GOOGLE_SA_KEY'
  | 'SHEET_ID'
  | 'GA_MEASUREMENT_ID'
  | 'GA_MP_API_SECRET'
>;

const confirmed = (s: SubscriberRow) => s.status === 'confirmed';

/**
 * @param token the raw token from the queue message; absent when the cron re-syncs, in which case a
 *   fresh one is issued (the old link can't be rebuilt from its hash).
 */
export function subscriberHandlers(
  env: SubscriberEnv,
  db: D1Database,
  token: string | undefined,
  now: () => Date = () => new Date(),
): SubscriberHandlers {
  const environment = env.ENVIRONMENT || 'local';
  return {
    confirm_email: async (subscriber) => {
      if (subscriber.status !== 'pending') return skip('not_pending');
      if (!subscriber.email) return skip('no_email');
      if (isReservedEmail(subscriber.email)) return skip('reserved_email');
      if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
      const raw = token ?? (await rotateToken(db, subscriber.subscriber_id!, now()));
      if (!raw) return skip('not_pending');
      // One key per token: a queue retry resends nothing, while a rotated token gets its own email.
      const key = `${subscriber.subscriber_id}:confirm:${(await hashToken(raw)).slice(0, 16)}`;
      await sendEmail(
        env.RESEND_API_KEY,
        confirmationEmail(subscriber.email, raw, environment, env.SITE_ORIGIN || profile.url),
        key,
      );
      return 'done';
    },

    // Once confirmed. A subscriber who unsubscribes before these run is skipped, not delivered.
    sheets: async (subscriber) => {
      if (!confirmed(subscriber)) return skip('not_confirmed');
      const { token, sheetId } = await sheetsAccess(env);
      await appendSubscriber(token, sheetId, subscriber);
      return 'done';
    },
    audience: async (subscriber) => {
      if (!confirmed(subscriber)) return skip('not_confirmed');
      if (!subscriber.email) return skip('no_email');
      if (isReservedEmail(subscriber.email)) return skip('reserved_email');
      if (!env.RESEND_CONTACTS_KEY || !env.RESEND_SEGMENT_ID) {
        throw new Error('Resend contacts not configured (RESEND_CONTACTS_KEY, RESEND_SEGMENT_ID)');
      }
      await upsertContact(env.RESEND_CONTACTS_KEY, subscriber.email, env.RESEND_SEGMENT_ID);
      return 'done';
    },
    checklist_email: async (subscriber) => {
      if (!confirmed(subscriber)) return skip('not_confirmed');
      if (!subscriber.email) return skip('no_email');
      if (isReservedEmail(subscriber.email)) return skip('reserved_email');
      if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
      // Keyed by confirmation, so a re-subscriber gets the checklist again but a retry doesn't.
      const key = `${subscriber.subscriber_id}:checklist:${subscriber.confirmed_at}`;
      await sendEmail(env.RESEND_API_KEY, checklistEmail(subscriber.email, environment), key);
      return 'done';
    },
    ga: async (subscriber) => {
      if (!confirmed(subscriber)) return skip('not_confirmed');
      if (!subscriber.ga_client_id) return skip('no_analytics_consent');
      if (!env.GA_MEASUREMENT_ID || !env.GA_MP_API_SECRET) {
        throw new Error('GA not configured (GA_MEASUREMENT_ID, GA_MP_API_SECRET)');
      }
      return sendSignUp(subscriber, subscriber.source ?? 'checklist', {
        measurementId: env.GA_MEASUREMENT_ID,
        apiSecret: env.GA_MP_API_SECRET,
        environment,
      });
    },

    // After an unsubscribe (Resend webhook): mark the Sheet row. D1 is already updated.
    sheet_status: async (subscriber) => {
      if (subscriber.status !== 'unsubscribed') return skip('not_unsubscribed');
      const { token, sheetId } = await sheetsAccess(env);
      await setSubscriberStatus(token, sheetId, subscriber.subscriber_id!, 'Unsubscribed');
      return 'done';
    },
  };
}

export async function deliverSubscriber(
  db: D1Database,
  subscriberId: string,
  handlers: SubscriberHandlers,
  now: () => Date = () => new Date(),
) {
  const subscriber = await getSubscriber(db, subscriberId);
  return runSteps(db, 'subscriber', subscriberId, subscriber, SUBSCRIBER_STEPS, handlers, now);
}
