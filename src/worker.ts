// Worker entry: Astro serves pages and /api/*; the queue consumer and cron handle lead delivery (ADR 003).
import { handle } from '@astrojs/cloudflare/handler';
import { sendAlert } from './lib/server/alert';
import {
  dailyMaintenance,
  deepChecks,
  sheetRetention,
  unsubscribedCleanup,
} from './lib/server/cron';
import {
  alertTransports,
  bookingHandlers,
  deliver,
  leadHandlers,
  type DeliveryMessage,
} from './lib/server/delivery';
import { retryDelaySeconds } from './lib/server/outbox';
import { subscriberHandlers } from './lib/server/subscriberDelivery';

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),

  // One message per lead or booking event. A failed step retries with backoff; after max_retries the message goes to
  // the dead-letter queue, while D1 keeps the lead and its outbox rows for the cron to re-sync.
  async queue(batch, env) {
    if (batch.queue.endsWith('-dlq')) {
      // Dead letters: alert once per batch and drop them. D1 still holds each lead, and the daily
      // cron re-syncs its undelivered steps.
      await sendAlert(
        {
          subject: `${batch.messages.length} message(s) moved to the dead-letter queue`,
          lines: batch.messages.map((m) => `${m.body.kind} ${m.body.id}`),
        },
        alertTransports(env),
      );
      batch.ackAll();
      return;
    }
    if (!env.DB) {
      batch.retryAll();
      return;
    }
    const db = env.DB;
    for (const message of batch.messages) {
      const body = message.body;
      try {
        const { failed } = await deliver(db, body, env);
        if (failed.length) {
          // kind + id only: a subscriber message also carries its confirmation token.
          console.error('delivery failed', {
            kind: body.kind,
            id: body.id,
            failed,
            attempt: message.attempts,
          });
          message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
        } else {
          message.ack();
        }
      } catch (error) {
        console.error('delivery error', { kind: body.kind, id: body.id, error: String(error) });
        message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
      }
    }
  },

  // Daily: re-sync undelivered steps, purge data past retention (D1, the Sheet and, for unsubscribed
  // addresses, Resend), deep health check, alerts.
  async scheduled(_controller, env) {
    if (!env.DB) return;
    await dailyMaintenance(
      env.DB,
      {
        lead: leadHandlers(env),
        booking: bookingHandlers(env),
        // No token here: a re-sent confirmation gets a fresh one.
        subscriber: subscriberHandlers(env, env.DB, undefined),
      },
      deepChecks(env),
      alertTransports(env),
      sheetRetention(env),
      unsubscribedCleanup(env),
    );
  },
} satisfies ExportedHandler<Env, DeliveryMessage>;
