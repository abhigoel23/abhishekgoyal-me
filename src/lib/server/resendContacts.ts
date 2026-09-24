// Resend contacts and segments (#110), and verification of Resend's webhooks. Contacts are global in
// Resend and grouped into segments; this site keeps one segment per environment (RESEND_SEGMENT_ID).
// Managing contacts needs a full-access key (RESEND_CONTACTS_KEY): the sending key can only send email.
const API = 'https://api.resend.com';

async function resendFetch(key: string, path: string, init: RequestInit, fetcher: typeof fetch) {
  return fetcher(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  });
}

async function fail(res: Response, what: string): Promise<never> {
  throw new Error(`Resend ${what} ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/**
 * Makes the address a subscribed contact in the segment. Creates it, or, if it already exists (a
 * re-subscriber, or another segment), clears `unsubscribed` and adds it to the segment. Safe to repeat.
 */
export async function upsertContact(
  key: string,
  email: string,
  segmentId: string,
  fetcher: typeof fetch = fetch,
) {
  const created = await resendFetch(
    key,
    '/contacts',
    {
      method: 'POST',
      body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segmentId }] }),
    },
    fetcher,
  );
  if (created.ok) return 'created' as const;
  // Only an "already exists" answer falls through to update; anything else fails the step.
  if (created.status !== 409 && created.status !== 422) await fail(created, 'create contact');

  const contact = encodeURIComponent(email);
  const updated = await resendFetch(
    key,
    `/contacts/${contact}`,
    { method: 'PATCH', body: JSON.stringify({ unsubscribed: false }) },
    fetcher,
  );
  if (!updated.ok) await fail(updated, 'update contact');
  const added = await resendFetch(
    key,
    `/contacts/${contact}/segments/${encodeURIComponent(segmentId)}`,
    { method: 'POST' },
    fetcher,
  );
  if (!added.ok) await fail(added, 'add to segment');
  return 'updated' as const;
}

/**
 * Deletes the contact from Resend (all segments), for the purge 30 days after unsubscribing. Already
 * gone counts as done. Resend then sends contact.deleted, which finds nothing left to mark.
 */
export async function deleteContact(key: string, email: string, fetcher: typeof fetch = fetch) {
  const res = await resendFetch(
    key,
    `/contacts/${encodeURIComponent(email)}`,
    { method: 'DELETE' },
    fetcher,
  );
  if (!res.ok && res.status !== 404) await fail(res, 'delete contact');
}

/** Health check: the key works and the segment exists (reads only). */
export async function checkSegment(key: string, segmentId: string, fetcher: typeof fetch = fetch) {
  const res = await resendFetch(key, `/segments/${encodeURIComponent(segmentId)}`, {}, fetcher);
  if (!res.ok) await fail(res, 'segment');
}

export const WEBHOOK_TOLERANCE_S = 5 * 60;

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Constant-time comparison, so the check doesn't leak how much of a signature matched. */
function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/**
 * Verifies a Resend (Svix) webhook: HMAC-SHA256 of `${svix-id}.${svix-timestamp}.${raw body}` keyed with
 * the base64 part of the `whsec_…` secret, matching any `v1,<base64>` entry in `svix-signature`, with
 * the timestamp within 5 minutes of now.
 */
export async function verifyWebhook(
  secret: string,
  headers: Headers,
  body: string,
  now: Date,
): Promise<boolean> {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signatures = headers.get('svix-signature');
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_S) return false;

  let keyBytes: Uint8Array<ArrayBuffer>;
  try {
    keyBytes = base64ToBytes(secret.replace(/^whsec_/, ''));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)),
  );
  for (const entry of signatures.split(' ')) {
    const [version, sig] = entry.split(',');
    if (version !== 'v1' || !sig) continue;
    try {
      if (equal(base64ToBytes(sig), expected)) return true;
    } catch {
      // Not base64: try the next entry.
    }
  }
  return false;
}
