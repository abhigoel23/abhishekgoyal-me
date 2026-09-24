import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { checkSegment, deleteContact, upsertContact, verifyWebhook } from './resendContacts';

const json = (status: number, body: unknown = {}) => Response.json(body, { status });

describe('upsertContact', () => {
  it('creates the contact in the segment', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(201, { id: 'c1' }));
    expect(await upsertContact('key', 'asha@acme.in', 'seg-1', fetcher)).toBe('created');
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/contacts');
    expect(JSON.parse(init!.body as string)).toEqual({
      email: 'asha@acme.in',
      unsubscribed: false,
      segments: [{ id: 'seg-1' }],
    });
    expect((init!.headers as Record<string, string>).authorization).toBe('Bearer key');
  });

  it('re-subscribes an existing contact and adds it to the segment', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(409, { message: 'Contact already exists' }))
      .mockResolvedValueOnce(json(200, { id: 'c1' }))
      .mockResolvedValueOnce(json(200, { id: 'seg-1' }));
    expect(await upsertContact('key', 'asha@acme.in', 'seg-1', fetcher)).toBe('updated');
    const calls = fetcher.mock.calls.map(([url, init]) => `${init!.method} ${String(url)}`);
    expect(calls).toEqual([
      'POST https://api.resend.com/contacts',
      'PATCH https://api.resend.com/contacts/asha%40acme.in',
      'POST https://api.resend.com/contacts/asha%40acme.in/segments/seg-1',
    ]);
    expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string)).toEqual({ unsubscribed: false });
  });

  it('fails the step on any other error (e.g. a sending-only key)', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(401, { message: 'restricted_api_key' }));
    await expect(upsertContact('key', 'a@b.in', 'seg-1', fetcher)).rejects.toThrow(
      /Resend create contact 401/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('deleteContact', () => {
  it('deletes by email, and treats an already-deleted contact as done', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200));
    await deleteContact('key', 'asha@acme.in', fetcher);
    expect(fetcher.mock.calls[0]![0]).toBe('https://api.resend.com/contacts/asha%40acme.in');
    expect(fetcher.mock.calls[0]![1]!.method).toBe('DELETE');
    await expect(deleteContact('key', 'a@b.in', async () => json(404))).resolves.toBeUndefined();
    await expect(deleteContact('key', 'a@b.in', async () => json(500))).rejects.toThrow(
      /delete contact 500/,
    );
  });
});

describe('checkSegment', () => {
  it('reads the segment and throws when it is missing', async () => {
    await expect(checkSegment('k', 's', async () => json(200))).resolves.toBeUndefined();
    await expect(checkSegment('k', 's', async () => json(404))).rejects.toThrow(/segment 404/);
  });
});

describe('verifyWebhook', () => {
  const secretBytes = Buffer.from('a-test-signing-secret-32-bytes!!');
  const secret = `whsec_${secretBytes.toString('base64')}`;
  const body = JSON.stringify({ type: 'contact.updated', data: { email: 'a@b.in' } });
  const now = new Date('2026-09-24T12:00:00Z');
  const ts = String(now.getTime() / 1000);

  const sign = (id: string, timestamp: string, payload: string) =>
    createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${payload}`).digest('base64');
  const headers = (signature: string, timestamp = ts, id = 'msg_1') =>
    new Headers({ 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature });

  it('accepts a valid signature, including among several entries', async () => {
    const good = `v1,${sign('msg_1', ts, body)}`;
    expect(await verifyWebhook(secret, headers(good), body, now)).toBe(true);
    expect(await verifyWebhook(secret, headers(`v1,bogus ${good}`), body, now)).toBe(true);
  });

  it('rejects a changed body, another secret, a wrong id and a missing header', async () => {
    const good = `v1,${sign('msg_1', ts, body)}`;
    expect(await verifyWebhook(secret, headers(good), `${body} `, now)).toBe(false);
    expect(await verifyWebhook('whsec_b3RoZXI=', headers(good), body, now)).toBe(false);
    expect(await verifyWebhook(secret, headers(good, ts, 'msg_2'), body, now)).toBe(false);
    expect(await verifyWebhook(secret, new Headers(), body, now)).toBe(false);
  });

  it('rejects timestamps more than 5 minutes away (replays)', async () => {
    const old = String(now.getTime() / 1000 - 301);
    expect(
      await verifyWebhook(secret, headers(`v1,${sign('msg_1', old, body)}`, old), body, now),
    ).toBe(false);
  });

  it('ignores other signature versions', async () => {
    expect(await verifyWebhook(secret, headers(`v2,${sign('msg_1', ts, body)}`), body, now)).toBe(
      false,
    );
  });
});
