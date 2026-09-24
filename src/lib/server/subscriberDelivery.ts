// Delivery steps for newsletter subscribers (#109). Only the confirmation email exists so far; the
// steps that run after confirming (Sheet, Resend Audience, checklist email, GA) arrive in #110 and stay
// `pending` until then.
import { confirmSubscription, sender } from '../../data/emails';
import { profile } from '../../data/profile';
import { isReservedEmail, sendEmail, type Email } from './notifications';
import { runSteps, skip, type Handlers } from './outbox';
import {
  getSubscriber,
  hashToken,
  rotateToken,
  SIGNUP_STEPS,
  CONFIRMED_STEPS,
  type SubscriberRow,
} from './subscriberStore';

export const SUBSCRIBER_STEPS = [...SIGNUP_STEPS, ...CONFIRMED_STEPS] as const;
export type SubscriberStep = (typeof SUBSCRIBER_STEPS)[number];
export type SubscriberHandlers = Handlers<SubscriberStep, SubscriberRow>;

/** The confirm link. The token sits in the fragment, which browsers never send to a server. */
export const confirmLink = (token: string) =>
  `${profile.url}/subscribe/confirm#t=${encodeURIComponent(token)}`;

export function confirmationEmail(to: string, token: string, environment: string): Email {
  const email: Email = {
    from: sender.from,
    to,
    subject: confirmSubscription.subject,
    text: [
      ...confirmSubscription.lines(confirmLink(token)),
      '',
      ...confirmSubscription.signature,
      '',
      ...confirmSubscription.footer,
    ].join('\n'),
  };
  // Outside production, never email visitors: send it to the inbox for review (as auto-replies do).
  if (environment === 'production') return email;
  return { ...email, to: sender.inbox, subject: `[${environment} → ${to}] ${email.subject}` };
}

type SubscriberEnv = Pick<Env, 'ENVIRONMENT' | 'RESEND_API_KEY'>;

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
        confirmationEmail(subscriber.email, raw, environment),
        key,
      );
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
