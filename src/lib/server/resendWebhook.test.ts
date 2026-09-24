import { describe, expect, it, vi } from 'vitest';
import { handleResendWebhook, type WebhookDeps } from './resendWebhook';

function deps(overrides: Partial<WebhookDeps> = {}) {
  return {
    verify: vi.fn(async () => true),
    unsubscribe: vi.fn(async () => 's-1'),
    enqueue: vi.fn(async () => {}),
    log: vi.fn(),
    ...overrides,
  } satisfies WebhookDeps;
}

const post = (event: unknown) =>
  new Request('https://abhishekgoyal.me/api/resend-webhook', {
    method: 'POST',
    body: JSON.stringify(event),
  });

const updated = (unsubscribed: boolean) => ({
  type: 'contact.updated',
  data: { email: 'asha@acme.in', unsubscribed },
});

describe('handleResendWebhook', () => {
  it('rejects a bad signature before reading the event', async () => {
    const d = deps({ verify: vi.fn(async () => false) });
    expect((await handleResendWebhook(post(updated(true)), d)).status).toBe(401);
    expect(d.unsubscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes on contact.updated with unsubscribed: true, and queues the Sheet update', async () => {
    const d = deps();
    expect((await handleResendWebhook(post(updated(true)), d)).status).toBe(200);
    expect(d.unsubscribe).toHaveBeenCalledWith('asha@acme.in');
    expect(d.enqueue).toHaveBeenCalledWith({ kind: 'subscriber', id: 's-1' });
  });

  it('treats contact.deleted as an unsubscribe', async () => {
    const d = deps();
    await handleResendWebhook(
      post({ type: 'contact.deleted', data: { email: 'asha@acme.in' } }),
      d,
    );
    expect(d.unsubscribe).toHaveBeenCalledWith('asha@acme.in');
  });

  it('ignores other updates and event types with a 200, so Resend does not retry', async () => {
    for (const event of [updated(false), { type: 'email.sent', data: { to: ['x@y.z'] } }, {}]) {
      const d = deps();
      expect((await handleResendWebhook(post(event), d)).status).toBe(200);
      expect(d.unsubscribe).not.toHaveBeenCalled();
    }
  });

  it('queues nothing for an address this environment does not know', async () => {
    const d = deps({ unsubscribe: vi.fn(async () => null) });
    expect((await handleResendWebhook(post(updated(true)), d)).status).toBe(200);
    expect(d.enqueue).not.toHaveBeenCalled();
  });

  it('lets a database error surface as a 500, so Resend retries', async () => {
    const d = deps({ unsubscribe: vi.fn(async () => Promise.reject(new Error('D1 down'))) });
    await expect(handleResendWebhook(post(updated(true)), d)).rejects.toThrow('D1 down');
  });
});
