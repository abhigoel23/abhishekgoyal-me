import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleSubscribe } from '../../lib/server/subscribeHandler';
import { saveSignup } from '../../lib/server/subscriberStore';
import { verifyTurnstile } from '../../lib/server/turnstile';

export const prerender = false;

// Newsletter sign-up with double opt-in (#109). Same bindings as /api/lead.
export const POST: APIRoute = async ({ request }) => {
  if (!env.DB || !env.LEAD_QUEUE || !env.RATE_LIMITER || !env.TURNSTILE_SECRET) {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
  const { DB, LEAD_QUEUE, RATE_LIMITER, TURNSTILE_SECRET } = env;
  return handleSubscribe(request, {
    // Its own key, so sign-ups and enquiries don't share a budget.
    rateLimit: async (ip) => (await RATE_LIMITER.limit({ key: `subscribe:${ip}` })).success,
    verifyTurnstile: (token, ip) => verifyTurnstile(token, TURNSTILE_SECRET, ip, 'subscribe'),
    saveSignup: (input, now) => saveSignup(DB, input, now),
    enqueue: async (message) => {
      await LEAD_QUEUE.send(message);
    },
    now: () => new Date(),
    log: (message, detail) => console.error(message, detail),
  });
};
