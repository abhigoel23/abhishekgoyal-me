import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleConfirm } from '../../../lib/server/subscribeHandler';
import { confirmToken } from '../../../lib/server/subscriberStore';

export const prerender = false;

// The Confirm button on /subscribe/confirm (#109). A plain GET of the emailed link confirms nothing.
export const POST: APIRoute = async ({ request }) => {
  if (!env.DB || !env.LEAD_QUEUE || !env.RATE_LIMITER) {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
  const { DB, LEAD_QUEUE, RATE_LIMITER } = env;
  return handleConfirm(request, {
    rateLimit: async (ip) => (await RATE_LIMITER.limit({ key: `confirm:${ip}` })).success,
    confirm: (token, now) => confirmToken(DB, token, now),
    enqueue: async (message) => {
      await LEAD_QUEUE.send(message);
    },
    now: () => new Date(),
    log: (message, detail) => console.error(message, detail),
  });
};
