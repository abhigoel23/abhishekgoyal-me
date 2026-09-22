// Cal.com booking webhooks → D1 `bookings` (current state) + one delivery per event (created,
// rescheduled, cancelled): a row in the Sheet's Bookings tab and a Telegram ping with no personal details.
import { z } from 'zod';
import type { Handlers } from './outbox';
import type { BookingEventRow } from './sheets';

export const BOOKING_STEPS = ['sheets', 'telegram'] as const;
export type BookingStep = (typeof BOOKING_STEPS)[number];
export type BookingHandlers = Handlers<BookingStep, BookingEventRow>;

const EVENTS = {
  BOOKING_CREATED: 'created',
  BOOKING_RESCHEDULED: 'rescheduled',
  BOOKING_CANCELLED: 'cancelled',
} as const;
type BookingEvent = (typeof EVENTS)[keyof typeof EVENTS];

/** Constant-time check of Cal.com's `x-cal-signature-256`: hex HMAC-SHA256 of the raw body. */
export async function verifyCalSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const sig = Uint8Array.from(signature.match(/../g)!, (h) => parseInt(h, 16));
  // subtle.verify compares in constant time.
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(rawBody));
}

const short = (max: number) => z.string().trim().max(max);

const webhookSchema = z.object({
  triggerEvent: z.string(),
  payload: z
    .object({
      uid: short(100).min(1),
      startTime: z.iso.datetime({ offset: true }),
      type: short(100).optional(),
      title: short(200).optional(),
      attendees: z
        .array(z.object({ name: short(200).default(''), email: short(254).default('') }))
        .default([]),
    })
    .optional(),
});

export type ParsedBooking = {
  event: BookingEvent;
  uid: string;
  startTime: string;
  name: string;
  email: string;
  eventType: string;
};

/** null for events we don't track (pings, meeting started, …) or payloads missing a booking. */
export function parseCalWebhook(body: unknown): ParsedBooking | null {
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success || !parsed.data.payload) return null;
  const event = EVENTS[parsed.data.triggerEvent as keyof typeof EVENTS];
  if (!event) return null;
  const { uid, startTime, type, title, attendees } = parsed.data.payload;
  return {
    event,
    uid,
    startTime: new Date(startTime).toISOString(),
    name: attendees[0]?.name ?? '',
    email: (attendees[0]?.email ?? '').toLowerCase(),
    eventType: type ?? title ?? '',
  };
}

/** Outbox/queue reference for one booking event. */
export const bookingRef = (uid: string, event: BookingEvent) => `${uid}:${event}`;

/**
 * Upserts the booking's current state and creates this event's pending steps. Returns the ref to
 * enqueue, or null if the same event was already recorded (Cal.com retries webhooks).
 */
export async function saveBooking(db: D1Database, b: ParsedBooking, now: Date) {
  const at = now.toISOString();
  const ref = bookingRef(b.uid, b.event);
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO bookings (booking_id, created_at, status, start_time, name, email, event_type, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (booking_id) DO UPDATE SET status = excluded.status,
           start_time = excluded.start_time, updated_at = excluded.updated_at`,
      )
      .bind(b.uid, at, b.event, b.startTime, b.name, b.email, b.eventType, at),
    ...BOOKING_STEPS.map((step) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO outbox_status (ref_kind, ref_id, step, status, updated_at)
           VALUES ('booking', ?, ?, 'pending', ?)`,
        )
        .bind(ref, step, at),
    ),
  ]);
  const created = results.slice(1).some((r) => r.meta.changes > 0);
  return created ? ref : null;
}

/** The Sheet/Telegram view of one event, rebuilt from D1 (so it survives queue retries). */
export async function getBookingEvent(db: D1Database, ref: string) {
  const [uid, event] = ref.split(':') as [string, string];
  const row = await db
    .prepare(
      `SELECT b.booking_id, b.start_time, b.name, b.email, b.event_type, o.updated_at AS received_at
       FROM bookings b JOIN outbox_status o ON o.ref_kind = 'booking' AND o.ref_id = ?
       WHERE b.booking_id = ? LIMIT 1`,
    )
    .bind(ref, uid)
    .first<Omit<BookingEventRow, 'event'>>();
  return row ? { ...row, event } : null;
}

const IST = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Telegram text: event and time only, no name or email. */
export function bookingTelegramText(b: Pick<BookingEventRow, 'event' | 'start_time'>, env: string) {
  const when = `${IST.format(new Date(b.start_time))} IST`;
  const text =
    b.event === 'cancelled'
      ? `❌ Intro call cancelled · was ${when}`
      : b.event === 'rescheduled'
        ? `🔁 Intro call rescheduled · now ${when} · see Sheet`
        : `📅 Intro call booked · ${when} · see Sheet`;
  return (env === 'production' ? '' : `[${env}] `) + text;
}
