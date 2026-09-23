// Server-side GA4 conversion via the Measurement Protocol (the lead's `ga` delivery step). Sent only
// when the form carried a GA client id, which exists only if the visitor consented to analytics.
// No PII: path, budget band and source only.
import type { LeadRow } from './leadStore';
import type { StepResult } from './outbox';

export type GaConfig = { measurementId: string; apiSecret: string; environment: string };

export function generateLeadEvent(lead: LeadRow) {
  return {
    client_id: lead.ga_client_id!,
    events: [
      {
        name: 'generate_lead',
        params: {
          // A random UUID, not PII: joins a GA conversion to its row in the Leads Sheet.
          lead_id: lead.lead_id,
          lead_path: lead.path ?? '',
          budget_band: lead.budget ?? 'none',
          lead_source: lead.utm_source ?? (lead.referrer ? 'referral' : 'direct'),
          engagement_time_msec: 1,
          // Without session_id the conversion isn't attributed to the visit that produced it.
          ...(lead.ga_session_id ? { session_id: lead.ga_session_id } : {}),
          // Measurement Protocol events reach DebugView only when they carry debug_mode.
          ...(lead.ga_debug === '1' ? { debug_mode: 1 } : {}),
          // The GA internal-traffic filter matches on this parameter, not on an IP address.
          ...(lead.ga_internal === '1' ? { traffic_type: 'internal' } : {}),
        },
      },
    ],
  };
}

export async function sendGenerateLead(
  lead: LeadRow,
  config: GaConfig,
  fetcher: typeof fetch = fetch,
): Promise<StepResult> {
  if (!lead.ga_client_id) return 'skipped';
  const production = config.environment === 'production';
  // Outside production, use the validation endpoint: GA checks the payload but records nothing, so
  // staging never pollutes the real reports.
  const endpoint = production
    ? 'https://www.google-analytics.com/mp/collect'
    : 'https://www.google-analytics.com/debug/mp/collect';
  const url = `${endpoint}?${new URLSearchParams({
    measurement_id: config.measurementId,
    api_secret: config.apiSecret,
  })}`;
  const body = JSON.stringify(generateLeadEvent(lead));
  const res = await fetcher(url, { method: 'POST', body });
  if (!res.ok) throw new Error(`GA ${res.status}`);
  if (!production) {
    const { validationMessages = [] } = (await res.json()) as {
      validationMessages?: { description: string }[];
    };
    if (validationMessages.length) {
      throw new Error(`GA validation: ${validationMessages.map((m) => m.description).join('; ')}`);
    }
    return 'done';
  }
  // The live endpoint answers 204 whatever it thinks of the payload, so a debug lead is mirrored to
  // the validation endpoint: a rejected event then shows up in the Worker logs instead of vanishing.
  if (lead.ga_debug === '1') {
    try {
      const check = await fetcher(url.replace('/mp/collect', '/debug/mp/collect'), {
        method: 'POST',
        body,
      });
      const { validationMessages = [] } = (await check.json()) as {
        validationMessages?: { description: string }[];
      };
      console.log('GA debug lead', {
        lead: lead.lead_id,
        session: lead.ga_session_id ?? 'missing',
        validationMessages,
      });
    } catch (error) {
      console.log('GA debug check failed', { lead: lead.lead_id, error: String(error) });
    }
  }
  return 'done';
}
