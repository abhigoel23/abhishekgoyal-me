import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearTokenCache, getAccessToken, signJwt, SHEETS_SCOPE } from './googleAuth';
import type { LeadRow } from './leadStore';
import { retryDelaySeconds } from './outbox';
import { sanitizeCell } from './sanitize';
import { appendLead, expiredRowRuns, LEAD_HEADERS, leadToRow, purgeLeadRows } from './sheets';

const NOW = new Date('2026-09-22T10:00:00Z');

async function testAccount() {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const b64 = btoa(String.fromCharCode(...der));
  // Shaped like the JSON key file's value: PEM with literal "\n" escapes.
  const pem = `-----BEGIN PRIVATE KEY-----\\n${b64.match(/.{1,64}/g)!.join('\\n')}\\n-----END PRIVATE KEY-----\\n`;
  return { sa: { email: 'bot@proj.iam.gserviceaccount.com', privateKeyPem: pem }, pair };
}

const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

describe('sanitizeCell', () => {
  it.each(['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\t=x', '\r=x'])('neutralises %j', (v) => {
    expect(sanitizeCell(v)).toBe(`'${v}`);
  });

  it('leaves normal text and empties alone', () => {
    expect(sanitizeCell('A booking app = fun')).toBe('A booking app = fun');
    expect(sanitizeCell(null)).toBe('');
    expect(sanitizeCell(undefined)).toBe('');
  });
});

describe('signJwt', () => {
  it('produces an RS256 JWT with the service-account claims and a valid signature', async () => {
    const { sa, pair } = await testAccount();
    const jwt = await signJwt(sa, SHEETS_SCOPE, NOW);
    const [header, claims, signature] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(fromB64url(header!)))).toEqual({
      alg: 'RS256',
      typ: 'JWT',
    });
    expect(JSON.parse(new TextDecoder().decode(fromB64url(claims!)))).toEqual({
      iss: sa.email,
      scope: SHEETS_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: NOW.getTime() / 1000,
      exp: NOW.getTime() / 1000 + 3600,
    });
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      pair.publicKey,
      fromB64url(signature!),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(valid).toBe(true);
  });
});

describe('getAccessToken', () => {
  afterEach(() => clearTokenCache());

  it('caches the token until a minute before expiry', async () => {
    const { sa } = await testAccount();
    const fetcher = vi.fn(async () => Response.json({ access_token: 'tok', expires_in: 3600 }));
    expect(await getAccessToken(sa, SHEETS_SCOPE, NOW, fetcher)).toBe('tok');
    await getAccessToken(sa, SHEETS_SCOPE, new Date(NOW.getTime() + 3_500_000), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await getAccessToken(sa, SHEETS_SCOPE, new Date(NOW.getTime() + 3_550_000), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('throws on a rejected grant', async () => {
    const { sa } = await testAccount();
    const fetcher = vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 }));
    await expect(getAccessToken(sa, SHEETS_SCOPE, NOW, fetcher)).rejects.toThrow('invalid_grant');
  });
});

const lead: LeadRow = {
  lead_id: 'L1',
  created_at: NOW.toISOString(),
  path: 'project',
  name: '=HYPERLINK("http://evil","x")',
  email: 'a@b.co',
  company: null,
  service: 'kmp',
  currency: 'INR',
  budget: 'inr-4-12l',
  timeline: '1-3m',
  role_title: null,
  work_mode: null,
  job_url: null,
  message: '=1+1',
  source_page: '/',
  utm_source: 'linkedin',
  utm_medium: null,
  utm_campaign: null,
  referrer: null,
  ga_session_id: null,
  ga_debug: null,
  ga_internal: null,
  ga_client_id: '1.2',
  consent_at: NOW.toISOString(),
  idempotency_key: 'k',
};

describe('leadToRow', () => {
  it('has one cell per header, uses labels, and sanitises every cell', () => {
    const row = leadToRow(lead);
    expect(row).toHaveLength(LEAD_HEADERS.length);
    const cell = (h: string) => row[LEAD_HEADERS.indexOf(h)];
    expect(cell('Path')).toBe('A project for my product or team');
    expect(cell('Service')).toBe('Kotlin Multiplatform migration');
    expect(cell('Budget')).toBe('₹4L–12L');
    expect(cell('Name')).toBe(`'=HYPERLINK("http://evil","x")`);
    expect(cell('Message')).toBe("'=1+1");
    expect(cell('Company')).toBe('');
    expect(cell('Status')).toBe('New');
  });

  it('never writes internal fields to the Sheet', () => {
    const row = leadToRow(lead).join('|');
    expect(row).not.toContain('1.2'); // ga_client_id
    expect(LEAD_HEADERS.join('|')).not.toMatch(/idempotency|consent/i);
  });
});

describe('appendLead', () => {
  it('writes the header to an empty tab, then appends with valueInputOption=RAW', async () => {
    const calls: { url: string; method: string; body?: string }[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body as string });
      return Response.json({});
    });
    await appendLead('tok', 'SHEET', lead, fetcher as typeof fetch);
    expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT', 'POST']);
    expect(calls[2]!.url).toContain(':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS');
    expect(JSON.parse(calls[1]!.body!).values[0]).toEqual(LEAD_HEADERS);
  });
});

describe('retryDelaySeconds', () => {
  it('backs off exponentially from a minute, capped at an hour', () => {
    expect([1, 2, 3, 4, 10].map(retryDelaySeconds)).toEqual([60, 120, 240, 480, 3600]);
  });
});

describe('Sheet retention', () => {
  const cutoff = '2025-03-22T00:00:00.000Z';
  const column = [
    ['Received (UTC)'], // header, never deleted
    ['2025-01-01T00:00:00.000Z'], // 1 expired
    ['2025-02-01T00:00:00.000Z'], // 2 expired
    ['2026-01-01T00:00:00.000Z'], // 3 kept
    ['2025-03-21T23:59:59.999Z'], // 4 expired
    ['hand-typed note'], // 5 kept: not a timestamp
    [], // 6 kept: empty
  ];

  it('finds expired rows as bottom-up runs, keeping the header and non-timestamps', () => {
    expect(expiredRowRuns(column, cutoff)).toEqual([
      [4, 5],
      [1, 3],
    ]);
  });

  it('deletes the runs from the Leads tab in one batchUpdate', async () => {
    const calls: { url: string; body?: string }[] = [];
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      calls.push({ url: String(url), body: init?.body as string | undefined });
      if (String(url).includes('/values/')) return Response.json({ values: column });
      if (String(url).includes('fields=sheets')) {
        return Response.json({ sheets: [{ properties: { sheetId: 7, title: 'Leads' } }] });
      }
      return Response.json({});
    });
    expect(await purgeLeadRows('tok', 'SHEET', cutoff, fetcher)).toBe(3);
    expect(calls[0]!.url).toContain(encodeURIComponent('Leads!B:B'));
    const { requests } = JSON.parse(calls[2]!.body!);
    expect(
      requests.map((r: { deleteDimension: { range: object } }) => r.deleteDimension.range),
    ).toEqual([
      { sheetId: 7, dimension: 'ROWS', startIndex: 4, endIndex: 5 },
      { sheetId: 7, dimension: 'ROWS', startIndex: 1, endIndex: 3 },
    ]);
  });

  it('makes no write calls when nothing has expired', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ values: [['Received (UTC)']] }),
    );
    expect(await purgeLeadRows('tok', 'SHEET', cutoff, fetcher)).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
