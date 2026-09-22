import { describe, expect, it } from 'vitest';
import { bookingTelegramText, parseCalWebhook, verifyCalSignature } from './bookings';

const SECRET = 'test-secret';

async function sign(body: string, secret = SECRET) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const created = {
  triggerEvent: 'BOOKING_CREATED',
  createdAt: '2026-09-22T10:00:00.000Z',
  payload: {
    uid: 'abc123',
    title: 'Intro call between Abhishek Goyal and Asha',
    type: 'intro-call',
    startTime: '2026-09-24T04:30:00Z',
    endTime: '2026-09-24T04:50:00Z',
    attendees: [{ name: 'Asha Rao', email: 'Asha@Acme.in', timeZone: 'Asia/Kolkata' }],
    organizer: { name: 'Abhishek Goyal', email: 'contact@abhishekgoyal.me' },
  },
};

describe('verifyCalSignature', () => {
  it('accepts the correct HMAC of the raw body', async () => {
    const body = JSON.stringify(created);
    expect(await verifyCalSignature(body, await sign(body), SECRET)).toBe(true);
  });

  it('rejects a missing, malformed, forged or wrong-secret signature', async () => {
    const body = JSON.stringify(created);
    expect(await verifyCalSignature(body, null, SECRET)).toBe(false);
    expect(await verifyCalSignature(body, 'nothex', SECRET)).toBe(false);
    expect(await verifyCalSignature(body, await sign(body, 'other'), SECRET)).toBe(false);
    // Tampered body with the original signature.
    const forged = body.replace('abc123', 'evil');
    expect(await verifyCalSignature(forged, await sign(body), SECRET)).toBe(false);
  });
});

describe('parseCalWebhook', () => {
  it('maps a created booking, lowercasing the email', () => {
    expect(parseCalWebhook(created)).toEqual({
      event: 'created',
      uid: 'abc123',
      startTime: '2026-09-24T04:30:00.000Z',
      name: 'Asha Rao',
      email: 'asha@acme.in',
      eventType: 'intro-call',
    });
  });

  it('maps rescheduled and cancelled events', () => {
    expect(parseCalWebhook({ ...created, triggerEvent: 'BOOKING_RESCHEDULED' })?.event).toBe(
      'rescheduled',
    );
    expect(parseCalWebhook({ ...created, triggerEvent: 'BOOKING_CANCELLED' })?.event).toBe(
      'cancelled',
    );
  });

  it('ignores pings, untracked events and payloads without a booking', () => {
    expect(parseCalWebhook({ triggerEvent: 'PING', createdAt: 'x' })).toBeNull();
    expect(parseCalWebhook({ ...created, triggerEvent: 'MEETING_ENDED' })).toBeNull();
    expect(parseCalWebhook({ triggerEvent: 'BOOKING_CREATED', payload: { uid: '' } })).toBeNull();
    expect(parseCalWebhook('nope')).toBeNull();
  });
});

describe('bookingTelegramText', () => {
  it('shows the time in IST and no personal details', () => {
    const text = bookingTelegramText(
      { event: 'created', start_time: '2026-09-24T04:30:00.000Z' },
      'production',
    );
    expect(text).toBe('📅 Intro call booked · Thu 24 Sept, 10:00 IST · see Sheet');
    expect(
      bookingTelegramText(
        { event: 'cancelled', start_time: '2026-09-24T04:30:00.000Z' },
        'staging',
      ),
    ).toMatch(/^\[staging\] ❌ Intro call cancelled · was /);
  });
});
