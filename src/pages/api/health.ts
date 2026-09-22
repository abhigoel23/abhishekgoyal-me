import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Public liveness check for deploy smoke tests and uptime monitors: is the Worker up and can it reach
// D1? Deliberately cheap and credential-free, so it can't be used to burn Google or Resend quota. The
// deep checks (real Sheets token, Resend key) run in the daily cron (src/lib/server/cron.ts).
export const GET: APIRoute = async () => {
  const headers = { 'cache-control': 'no-store' };
  if (!env.DB) return Response.json({ ok: true, db: 'not configured' }, { headers });
  try {
    await env.DB.prepare('SELECT 1').first();
    return Response.json({ ok: true, db: 'ok' }, { headers });
  } catch {
    return Response.json({ ok: false, db: 'error' }, { status: 503, headers });
  }
};
