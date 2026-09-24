// Server-side GA4 conversions via the Measurement Protocol (the `ga` delivery steps for leads and
// subscribers). Sent only
// when the form carried a GA client id, which exists only if the visitor consented to analytics.
// No PII: path, budget band and source only.
import type { LeadRow } from './leadStore';
import { skip, type StepResult } from './outbox';

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
  if (!lead.ga_client_id) return skip('no_analytics_consent');
  await sendMeasurement(generateLeadEvent(lead), config, lead.ga_debug === '1', fetcher, {
    lead: lead.lead_id,
    session: lead.ga_session_id ?? 'missing',
  });
  return 'done';
}

/** The ids and flags an event is sent with; leads and subscribers both carry them. */
type GaIds = {
  ga_client_id: string | null;
  ga_session_id: string | null;
  ga_debug: string | null;
  ga_internal: string | null;
};

/** `sign_up` (#110): a newsletter address was confirmed. Key event, like generate_lead. */
export function signUpEvent(ids: GaIds, method: string) {
  return {
    client_id: ids.ga_client_id!,
    events: [
      {
        name: 'sign_up',
        params: {
          method,
          engagement_time_msec: 1,
          // Confirming usually happens later, often on another device, so this session id is from
          // the sign-up visit; GA may not join it to that session if it has ended.
          ...(ids.ga_session_id ? { session_id: ids.ga_session_id } : {}),
          ...(ids.ga_debug === '1' ? { debug_mode: 1 } : {}),
          ...(ids.ga_internal === '1' ? { traffic_type: 'internal' } : {}),
        },
      },
    ],
  };
}

export async function sendSignUp(
  ids: GaIds & { subscriber_id: string | null },
  method: string,
  config: GaConfig,
  fetcher: typeof fetch = fetch,
): Promise<StepResult> {
  if (!ids.ga_client_id) return skip('no_analytics_consent');
  await sendMeasurement(signUpEvent(ids, method), config, ids.ga_debug === '1', fetcher, {
    subscriber: ids.subscriber_id,
    session: ids.ga_session_id ?? 'missing',
  });
  return 'done';
}

/** Sends one Measurement Protocol payload. Throws on failure so the outbox step retries. */
async function sendMeasurement(
  payload: object,
  config: GaConfig,
  debug: boolean,
  fetcher: typeof fetch,
  logFields: Record<string, unknown>,
) {
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
  const body = JSON.stringify(payload);
  const res = await fetcher(url, { method: 'POST', body });
  if (!res.ok) throw new Error(`GA ${res.status}`);
  if (!production) {
    const { validationMessages = [] } = (await res.json()) as {
      validationMessages?: { description: string }[];
    };
    if (validationMessages.length) {
      throw new Error(`GA validation: ${validationMessages.map((m) => m.description).join('; ')}`);
    }
    return;
  }
  // The live endpoint answers 204 whatever it thinks of the payload, so a debug event is mirrored to
  // the validation endpoint: a rejected event then shows up in the Worker logs instead of vanishing.
  if (debug) {
    try {
      const check = await fetcher(url.replace('/mp/collect', '/debug/mp/collect'), {
        method: 'POST',
        body,
      });
      const { validationMessages = [] } = (await check.json()) as {
        validationMessages?: { description: string }[];
      };
      console.log('GA debug event', { ...logFields, validationMessages });
    } catch (error) {
      console.log('GA debug check failed', { ...logFields, error: String(error) });
    }
  }
}
