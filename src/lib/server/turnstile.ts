// Cloudflare Turnstile server-side check. Local and staging use Cloudflare's public test keys
// (secret 1x0000000000000000000000000000000AA always passes); production keys arrive in M4.
import type { TurnstileAction } from '../../data/turnstile';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type SiteverifyResponse = { success: boolean; action?: string; 'error-codes'?: string[] };

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  action: TurnstileAction,
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
    // Test keys return no action; real widgets must carry this form's, so a token solved on one form
    // can't be spent on another.
    return data.success === true && (data.action === undefined || data.action === action);
  } catch {
    return false;
  }
}
