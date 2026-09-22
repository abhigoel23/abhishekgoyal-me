import { describe, expect, it, vi } from 'vitest';
import type { LeadRow } from './leadStore';
import {
  autoReplyEmail,
  isReservedEmail,
  notificationSteps,
  notifyEmail,
  sendEmail,
  telegramText,
} from './notifications';

const base: LeadRow = {
  lead_id: 'L1',
  created_at: '2026-09-22T10:00:00.000Z',
  path: 'project',
  name: 'Asha Rao',
  email: 'asha@acme.in',
  company: 'Acme\r\nBcc: victim@evil.example',
  service: 'mvp',
  currency: 'INR',
  budget: 'inr-4-12l',
  timeline: '1-3m',
  role_title: null,
  work_mode: null,
  job_url: null,
  message: 'A booking app',
  source_page: '/',
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  referrer: null,
  ga_session_id: null,
  ga_debug: null,
  ga_internal: null,
  ga_client_id: null,
  consent_at: '2026-09-22T10:00:00.000Z',
  idempotency_key: 'k',
};
const role: LeadRow = { ...base, path: 'role', role_title: 'Staff\nEngineer', work_mode: 'remote' };

describe('telegramText', () => {
  it('carries no personal details', () => {
    for (const lead of [base, role]) {
      const text = telegramText(lead, 'production');
      for (const pii of ['Asha', 'asha@acme.in', 'Acme', 'booking', 'Staff']) {
        expect(text).not.toContain(pii);
      }
    }
    expect(telegramText(base, 'production')).toBe(
      '🆕 New project lead · ₹4L–12L · In 1–3 months · see Sheet',
    );
    expect(telegramText(role, 'staging')).toBe(
      '[staging] 🆕 New role enquiry · Remote · see Sheet',
    );
  });
});

describe('emails', () => {
  it('keeps visitor input out of headers (no header injection)', () => {
    expect(notifyEmail(role, 'production').subject).not.toMatch(/[\r\n]/);
    expect(autoReplyEmail(role).subject).not.toMatch(/[\r\n]/);
  });

  it('notifies the inbox with reply-to the lead, and labelled fields', () => {
    const email = notifyEmail(base, 'staging');
    expect(email).toMatchObject({ to: 'contact@abhishekgoyal.me', reply_to: 'asha@acme.in' });
    expect(email.subject).toBe('[staging] New project lead: Asha Rao · ₹4L–12L');
    expect(email.text).toContain('Budget: ₹4L–12L');
    expect(email.text).not.toContain('Status:');
  });

  it('auto-replies by first name with the deletion footer', () => {
    const email = autoReplyEmail(base);
    expect(email).toMatchObject({ to: 'asha@acme.in', reply_to: 'contact@abhishekgoyal.me' });
    expect(email.text).toMatch(/^Hi Asha,/);
    expect(email.text).toContain('within 2 working days');
    expect(email.text).toContain('reply to this email with DELETE');
  });
});

describe('isReservedEmail', () => {
  it.each(['a@example.com', 'a@sub.example.org', 'a@x.test', 'a@foo.invalid', 'a@localhost'])(
    'flags %s',
    (e) => expect(isReservedEmail(e)).toBe(true),
  );
  it('allows real domains', () => {
    expect(isReservedEmail('a@examples.com')).toBe(false);
    expect(isReservedEmail('a@gmail.com')).toBe(false);
  });
});

describe('sendEmail', () => {
  it('sends an Idempotency-Key so retries send once', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: 'e1' }));
    await sendEmail('key', notifyEmail(base, 'production'), 'L1:notify', fetcher);
    const init = fetcher.mock.calls[0]![1]!;
    expect((init.headers as Record<string, string>)['idempotency-key']).toBe('L1:notify');
  });
});

describe('notificationSteps.autoreply', () => {
  it('skips reserved test addresses without sending', async () => {
    const steps = notificationSteps({ ENVIRONMENT: 'production', RESEND_API_KEY: 'k' } as never);
    expect(await steps.autoreply({ ...base, email: 'bot@example.com' })).toBe('skipped');
  });

  it('outside production, sends the auto-reply to the inbox instead of the visitor', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'e' }));
    const steps = notificationSteps({ ENVIRONMENT: 'staging', RESEND_API_KEY: 'k' } as never);
    expect(await steps.autoreply(base)).toBe('done');
    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.to).toBe('contact@abhishekgoyal.me');
    expect(body.subject).toMatch(/^\[staging → asha@acme\.in\] /);
    fetchSpy.mockRestore();
  });

  it('fails the step when Resend is not configured', async () => {
    const steps = notificationSteps({ ENVIRONMENT: 'production' } as never);
    await expect(steps.notify(base)).rejects.toThrow('RESEND_API_KEY not configured');
  });
});
