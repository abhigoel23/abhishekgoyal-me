// Worker entry: Astro serves pages and /api/*; the queue consumer and cron handle lead delivery (ADR 003).
import { handle } from '@astrojs/cloudflare/handler';
import { sendAlert } from './lib/server/alert';
import { dailyMaintenance, deepChecks, sheetRetention } from './lib/server/cron';
import { alertTransports, leadHandlers, type LeadMessage } from './lib/server/delivery';
import { deliverLead, retryDelaySeconds } from './lib/server/outbox';

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),

  // One message per lead. A failed step retries with backoff; after max_retries the message goes to
  // the dead-letter queue, while D1 keeps the lead and its outbox rows for the cron to re-sync.
  async queue(batch, env) {
    if (batch.queue.endsWith('-dlq')) {
      // Dead letters: alert once per batch and drop them. D1 still holds each lead, and the daily
      // cron re-syncs its undelivered steps.
      await sendAlert(
        {
          subject: `${batch.messages.length} lead(s) moved to the dead-letter queue`,
          lines: batch.messages.map((m) => `lead ${m.body.id}`),
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
    const handlers = leadHandlers(env);
    for (const message of batch.messages) {
      const body = message.body;
      try {
        const { failed } = await deliverLead(db, body.id, handlers);
        if (failed.length) {
          console.error('lead delivery failed', {
            leadId: body.id,
            failed,
            attempt: message.attempts,
          });
          message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
        } else {
          message.ack();
        }
      } catch (error) {
        console.error('lead delivery error', { leadId: body.id, error: String(error) });
        message.retry({ delaySeconds: retryDelaySeconds(message.attempts) });
      }
    }
  },

  // Daily: re-sync undelivered steps, purge data past retention (D1 and the Sheet), deep health
  // check, alerts.
  async scheduled(_controller, env) {
    if (!env.DB) return;
    await dailyMaintenance(
      env.DB,
      leadHandlers(env),
      deepChecks(env),
      alertTransports(env),
      sheetRetention(env),
    );
  },
} satisfies ExportedHandler<Env, LeadMessage>;
