import { afterEach, describe, expect, it, vi } from 'vitest';
import { gaClientId, gaSessionId, track } from '../track';
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

const tagged = {
  ...lead,
  ga_session_id: '1790098349',
  ga_debug: '1',
  ga_internal: '1',
} as unknown as LeadRow;

describe('gaClientId', () => {
  it('extracts the client id from the _ga cookie', () => {
    expect(gaClientId('theme=dark; _ga=GA1.1.123456789.1726990000; x=1')).toBe(
      '123456789.1726990000',
    );
    expect(gaClientId('_ga_ABC=GS1.1.x; foo=bar')).toBeUndefined();
    expect(gaClientId('')).toBeUndefined();
  });
});

describe('gaSessionId', () => {
  it('reads the session id from the dot-separated cookie', () => {
    const cookie =
      'theme=dark; _ga=GA1.1.1.2; _ga_PHG39RRGSZ=GS1.1.1790098349.1.0.1790098349.0.0.0';
    expect(gaSessionId('G-PHG39RRGSZ', cookie)).toBe('1790098349');
  });

  // The format GA4 actually sets today. The first launch-gate lead stored no session id because of it.
  it('reads the session id from the $-separated cookie', () => {
    const cookie =
      '_ga_PHG39RRGSZ=GS2.1.s1790172090$o1$g0$t1790172090$j60$l0$h0; _ga=GA1.1.538898007.1790172091';
    expect(gaSessionId('G-PHG39RRGSZ', cookie)).toBe('1790172090');
  });

  it('reads it as the last cookie in the string', () => {
    expect(gaSessionId('G-PHG39RRGSZ', 'x=1; _ga_PHG39RRGSZ=GS2.1.s1790172090')).toBe('1790172090');
  });

  it('is undefined without GA, for another stream, or for an odd id', () => {
    expect(gaSessionId('G-PHG39RRGSZ', '_ga=GA1.1.1.2')).toBeUndefined();
    expect(gaSessionId('G-OTHER', '_ga_PHG39RRGSZ=GS1.1.1790098349.1')).toBeUndefined();
    expect(gaSessionId('G-BAD.(', '_ga_PHG39RRGSZ=GS1.1.1790098349.1')).toBeUndefined();
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

  it('omits the session, debug and traffic params when the browser sent nothing', () => {
    const params = generateLeadEvent(lead).events[0]!.params;
    expect(params).not.toHaveProperty('session_id');
    expect(params).not.toHaveProperty('debug_mode');
    expect(params).not.toHaveProperty('traffic_type');
  });

  it('joins the GA session and marks debug and internal traffic when they are set', () => {
    expect(generateLeadEvent(tagged).events[0]!.params).toMatchObject({
      session_id: '1790098349',
      debug_mode: 1,
      traffic_type: 'internal',
      engagement_time_msec: 1,
    });
  });
});

describe('sendGenerateLead', () => {
  it('mirrors a debug lead to the validation endpoint in production', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) =>
      String(input).includes('/debug/mp/collect')
        ? new Response(JSON.stringify({ validationMessages: [] }))
        : new Response(null, { status: 204 }),
    );
    expect(await sendGenerateLead(tagged, config, fetcher)).toBe('done');
    const urls = fetcher.mock.calls.map(([input]) => String(input));
    expect(urls.filter((u) => u.includes('/debug/mp/collect'))).toHaveLength(1);
    expect(urls.filter((u) => !u.includes('/debug/'))).toHaveLength(1);
  });

  it('still succeeds when the debug mirror fails', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes('/debug/mp/collect')) throw new Error('offline');
      return new Response(null, { status: 204 });
    });
    expect(await sendGenerateLead(tagged, config, fetcher)).toBe('done');
  });

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
