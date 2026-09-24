import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

const reply = (body: unknown) => vi.fn<typeof fetch>(async () => Response.json(body));

describe('verifyTurnstile', () => {
  it('accepts a token solved for this form, or a test-key token with no action', async () => {
    const ok = reply({ success: true, action: 'subscribe' });
    expect(await verifyTurnstile('t', 's', null, 'subscribe', ok)).toBe(true);
    expect(await verifyTurnstile('t', 's', null, 'lead', reply({ success: true }))).toBe(true);
  });

  it('refuses a token solved on another form', async () => {
    const lead = reply({ success: true, action: 'lead' });
    expect(await verifyTurnstile('t', 's', null, 'subscribe', lead)).toBe(false);
  });

  it('refuses a failed check, an empty token and a network error without calling out', async () => {
    expect(await verifyTurnstile('t', 's', null, 'lead', reply({ success: false }))).toBe(false);
    const never = vi.fn<typeof fetch>();
    expect(await verifyTurnstile('', 's', null, 'lead', never)).toBe(false);
    expect(never).not.toHaveBeenCalled();
    const down = vi.fn<typeof fetch>(async () => Promise.reject(new Error('offline')));
    expect(await verifyTurnstile('t', 's', null, 'lead', down)).toBe(false);
  });
});
