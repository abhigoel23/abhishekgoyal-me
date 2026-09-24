// POST /api/resend-webhook (#110): Resend tells us when a contact unsubscribes (contact.updated with
// unsubscribed: true) or is deleted. The signature is checked first; anything else is acknowledged and
// ignored, so Resend doesn't retry events this site doesn't use.
export const MAX_WEBHOOK_BYTES = 64 * 1024;

export type WebhookDeps = {
  verify: (headers: Headers, body: string) => Promise<boolean>;
  /** Returns the subscriber id if the address was on this environment's list and is now unsubscribed. */
  unsubscribe: (email: string) => Promise<string | null>;
  enqueue: (message: { kind: 'subscriber'; id: string }) => Promise<void>;
  log: (message: string, detail?: unknown) => void;
};

type ContactEvent = { type?: unknown; data?: { email?: unknown; unsubscribed?: unknown } };

export async function handleResendWebhook(request: Request, deps: WebhookDeps) {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_WEBHOOK_BYTES) {
    return new Response('too large', { status: 413 });
  }
  if (!(await deps.verify(request.headers, body))) {
    return new Response('invalid signature', { status: 401 });
  }
  let event: ContactEvent;
  try {
    event = JSON.parse(body) as ContactEvent;
  } catch {
    return new Response('invalid json', { status: 400 });
  }
  const email = typeof event.data?.email === 'string' ? event.data.email : null;
  const leaving =
    (event.type === 'contact.updated' && event.data?.unsubscribed === true) ||
    event.type === 'contact.deleted';
  if (!leaving || !email) return new Response('ignored', { status: 200 });

  // An error here returns 500, so Resend retries the event.
  const subscriberId = await deps.unsubscribe(email);
  if (subscriberId) {
    try {
      await deps.enqueue({ kind: 'subscriber', id: subscriberId });
    } catch (error) {
      deps.log('unsubscribe enqueue failed; cron will re-sync', {
        subscriberId,
        error: String(error),
      });
    }
  }
  return new Response('ok', { status: 200 });
}
