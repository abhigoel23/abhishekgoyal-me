// Cloudflare Turnstile server-side check. Local and staging use Cloudflare's public test keys
// (secret 1x0000000000000000000000000000000AA always passes); production keys arrive in M4.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const TURNSTILE_ACTION = 'lead';

type SiteverifyResponse = { success: boolean; action?: string; 'error-codes'?: string[] };

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetcher(VERIFY_URL, { method: 'POST', body });
    if (!res.ok) return false;
    const data = (await res.json()) as SiteverifyResponse;
    // Test keys return no action; real widgets must carry ours so tokens from other forms are refused.
    return data.success === true && (data.action === undefined || data.action === TURNSTILE_ACTION);
  } catch {
    return false;
  }
}
