import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { parseCalWebhook, saveBooking, verifyCalSignature } from '../../lib/server/bookings';

export const prerender = false;

const MAX_BODY_BYTES = 64 * 1024;

// Cal.com webhook (Settings → Developer → Webhooks). Signed with CAL_WEBHOOK_SECRET; anything unsigned
// or forged gets 401 before the body is parsed.
export const POST: APIRoute = async ({ request }) => {
  if (!env.DB || !env.LEAD_QUEUE || !env.CAL_WEBHOOK_SECRET) {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ ok: false }, { status: 413 });
  const signature = request.headers.get('x-cal-signature-256');
  if (!(await verifyCalSignature(raw, signature, env.CAL_WEBHOOK_SECRET))) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const booking = parseCalWebhook(body);
  // Pings and events we don't track: acknowledge so Cal.com doesn't retry.
  if (!booking) return Response.json({ ok: true, ignored: true });

  const ref = await saveBooking(env.DB, booking, new Date());
  if (ref) {
    try {
      await env.LEAD_QUEUE.send({ kind: 'booking', id: ref });
    } catch (error) {
      console.error('booking enqueue failed; cron will re-sync', { ref, error: String(error) });
    }
  }
  return Response.json({ ok: true });
};
