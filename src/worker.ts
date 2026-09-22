// Worker entry: Astro serves pages and /api/*; the queue consumer and cron handle lead delivery (ADR 003).
import { handle } from '@astrojs/cloudflare/handler';
import { leadHandlers, type LeadMessage } from './lib/server/delivery';
import { deliverLead, retryDelaySeconds } from './lib/server/outbox';

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),

  // One message per lead. A failed step retries with backoff; after max_retries the message goes to
  // the dead-letter queue, while D1 keeps the lead and its outbox rows for the cron to re-sync (#61).
  async queue(batch, env) {
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

  // Daily health check, outbox re-sync and retention purge land in #61.
  async scheduled() {},
} satisfies ExportedHandler<Env, LeadMessage>;
