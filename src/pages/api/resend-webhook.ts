import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyWebhook } from '../../lib/server/resendContacts';
import { handleResendWebhook } from '../../lib/server/resendWebhook';
import { markUnsubscribed } from '../../lib/server/subscriberStore';

export const prerender = false;

// Resend → Webhooks → this URL, events contact.updated and contact.deleted (#110).
export const POST: APIRoute = async ({ request }) => {
  if (!env.DB || !env.LEAD_QUEUE || !env.RESEND_WEBHOOK_SECRET) {
    return new Response('unavailable', { status: 503 });
  }
  const { DB, LEAD_QUEUE, RESEND_WEBHOOK_SECRET } = env;
  return handleResendWebhook(request, {
    verify: (headers, body) => verifyWebhook(RESEND_WEBHOOK_SECRET, headers, body, new Date()),
    unsubscribe: (email) => markUnsubscribed(DB, email, new Date()),
    enqueue: async (message) => {
      await LEAD_QUEUE.send(message);
    },
    log: (message, detail) => console.error(message, detail),
  });
};
