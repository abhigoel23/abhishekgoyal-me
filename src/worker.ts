// Worker entry: Astro serves pages and /api/*; the queue consumer and cron handle lead delivery (ADR 003).
import { handle } from '@astrojs/cloudflare/handler';

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),

  // Delivery steps (Sheets, email, Telegram) land in #58 and #59. Until then nothing is acknowledged:
  // D1 is the source of truth, and undelivered messages go to the dead-letter queue.
  async queue(batch) {
    batch.retryAll();
  },

  // Daily health check, outbox re-sync and retention purge land in #61.
  async scheduled() {},
} satisfies ExportedHandler<Env>;
