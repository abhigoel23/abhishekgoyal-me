import { afterEach, describe, expect, it, vi } from 'vitest';
import { gaClientId, track } from '../track';
import { generateLeadEvent, sendGenerateLead } from './ga';
import type { LeadRow } from './leadStore';

const lead = {
  lead_id: 'L1',
  path: 'project',
  name: 'Asha Rao',
  email: 'asha@acme.in',
  company: 'Acme',
  message: 'secret plans',
  budget: 'inr-4-12l',
  utm_source: 'linkedin',
  referrer: null,
  ga_client_id: '123.456',
} as unknown as LeadRow;

const config = { measurementId: 'G-TEST', apiSecret: 's3cret', environment: 'production' };

describe('gaClientId', () => {
  it('extracts the client id from the _ga cookie', () => {
    expect(gaClientId('theme=dark; _ga=GA1.1.123456789.1726990000; x=1')).toBe(
      '123456789.1726990000',
    );
    expect(gaClientId('_ga_ABC=GS1.1.x; foo=bar')).toBeUndefined();
    expect(gaClientId('')).toBeUndefined();
  });
});

describe('track', () => {
  afterEach(() => {
    delete (globalThis as { gtag?: unknown }).gtag;
  });

  it('is a no-op until gtag exists (no consent yet)', () => {
    expect(() => track({ name: 'cta_click', params: { cta: 'x' } })).not.toThrow();
  });

  it('forwards to gtag once loaded', () => {
    const gtag = vi.fn();
    (globalThis as { gtag?: unknown }).gtag = gtag;
    track({ name: 'form_step', params: { lead_path: 'role' } });
    expect(gtag).toHaveBeenCalledWith('event', 'form_step', { lead_path: 'role' });
  });
});

describe('generateLeadEvent', () => {
  it('carries no personal details', () => {
    const payload = JSON.stringify(generateLeadEvent(lead));
    for (const pii of ['Asha', 'asha@acme.in', 'Acme', 'secret plans']) {
      expect(payload).not.toContain(pii);
    }
    expect(generateLeadEvent(lead).events[0]!.params).toMatchObject({
      lead_path: 'project',
      budget_band: 'inr-4-12l',
      lead_source: 'linkedin',
    });
  });
});

describe('sendGenerateLead', () => {
  it('skips leads without a client id (no analytics consent)', async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await sendGenerateLead({ ...lead, ga_client_id: null }, config, fetcher)).toBe(
      'skipped',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts to the live endpoint in production', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    expect(await sendGenerateLead(lead, config, fetcher)).toBe('done');
    expect(String(fetcher.mock.calls[0]![0])).toMatch(
      /^https:\/\/www\.google-analytics\.com\/mp\/collect\?measurement_id=G-TEST&api_secret=/,
    );
  });

  it('only validates outside production, and fails on validation messages', async () => {
    const ok = vi.fn<typeof fetch>(async () => Response.json({ validationMessages: [] }));
    const staging = { ...config, environment: 'staging' };
    expect(await sendGenerateLead(lead, staging, ok)).toBe('done');
    expect(String(ok.mock.calls[0]![0])).toContain('/debug/mp/collect');

    const bad = vi.fn<typeof fetch>(async () =>
      Response.json({ validationMessages: [{ description: 'bad param' }] }),
    );
    await expect(sendGenerateLead(lead, staging, bad)).rejects.toThrow('bad param');
  });
});
