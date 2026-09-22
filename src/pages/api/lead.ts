import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleLead } from '../../lib/server/leadHandler';
import { saveLead } from '../../lib/server/leadStore';
import { verifyTurnstile } from '../../lib/server/turnstile';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Lead bindings exist on staging now and on production from M4.
  if (!env.DB || !env.LEAD_QUEUE || !env.RATE_LIMITER || !env.TURNSTILE_SECRET) {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
  const { DB, LEAD_QUEUE, RATE_LIMITER, TURNSTILE_SECRET } = env;
  return handleLead(request, {
    rateLimit: async (key) => (await RATE_LIMITER.limit({ key })).success,
    verifyTurnstile: (token, ip) => verifyTurnstile(token, TURNSTILE_SECRET, ip),
    saveLead: (lead, now) => saveLead(DB, lead, now),
    enqueue: async (leadId) => {
      await LEAD_QUEUE.send({ kind: 'lead', id: leadId });
    },
    now: () => new Date(),
    log: (message, detail) => console.error(message, detail),
  });
};
