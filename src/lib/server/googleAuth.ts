// Google service-account OAuth for Workers: sign a JWT with WebCrypto (RS256) and swap it for an access
// token. No Google SDK: it doesn't run on workerd. The token is cached per isolate until a minute
// before it expires.
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export type ServiceAccount = { email: string; privateKeyPem: string };

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const b64urlJson = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));

async function importKey(pem: string) {
  // Secrets pasted from the JSON key file may keep literal "\n" sequences; normalise them.
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function signJwt(sa: ServiceAccount, scope: string, now: Date) {
  const iat = Math.floor(now.getTime() / 1000);
  const header = b64urlJson({ alg: 'RS256', typ: 'JWT' });
  const claims = b64urlJson({ iss: sa.email, scope, aud: TOKEN_URL, iat, exp: iat + 3600 });
  const input = `${header}.${claims}`;
  const key = await importKey(sa.privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(input),
  );
  return `${input}.${b64url(new Uint8Array(signature))}`;
}

let cached: { key: string; token: string; expiresAt: number } | undefined;

export async function getAccessToken(
  sa: ServiceAccount,
  scope: string,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const cacheKey = `${sa.email}|${scope}`;
  if (cached && cached.key === cacheKey && cached.expiresAt > now.getTime() + 60_000) {
    return cached.token;
  }
  const assertion = await signJwt(sa, scope, now);
  const res = await fetcher(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    // Google's error body names the problem (invalid_grant etc.) and never echoes the key.
    throw new Error(`Google token request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: now.getTime() + data.expires_in * 1000,
  };
  return data.access_token;
}

export function clearTokenCache() {
  cached = undefined;
}

/** A Sheets token and the Sheet id, or an error naming what's missing (fails only that step). */
export async function sheetsAccess(
  env: Pick<Env, 'GOOGLE_SA_EMAIL' | 'GOOGLE_SA_KEY' | 'SHEET_ID'>,
) {
  if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_KEY || !env.SHEET_ID) {
    throw new Error('Sheets not configured (GOOGLE_SA_EMAIL, GOOGLE_SA_KEY, SHEET_ID)');
  }
  const token = await getAccessToken(
    { email: env.GOOGLE_SA_EMAIL, privateKeyPem: env.GOOGLE_SA_KEY },
    SHEETS_SCOPE,
  );
  return { token, sheetId: env.SHEET_ID };
}
