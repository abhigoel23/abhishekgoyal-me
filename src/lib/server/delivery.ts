// Wires the delivery steps to their integrations for the queue consumer (src/worker.ts). Each step reads
// only the config it needs, so a missing secret fails that step alone.
import type { AlertTransport } from './alert';
import { getAccessToken, SHEETS_SCOPE } from './googleAuth';
import type { StepHandlers } from './outbox';
import { appendLead } from './sheets';

export type LeadMessage = { kind: 'lead'; id: string };

export function leadHandlers(env: Env): StepHandlers {
  return {
    sheets: async (lead) => {
      if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_KEY || !env.SHEET_ID) {
        throw new Error('Sheets not configured (GOOGLE_SA_EMAIL, GOOGLE_SA_KEY, SHEET_ID)');
      }
      const token = await getAccessToken(
        { email: env.GOOGLE_SA_EMAIL, privateKeyPem: env.GOOGLE_SA_KEY },
        SHEETS_SCOPE,
      );
      await appendLead(token, env.SHEET_ID, lead);
      return 'done';
    },
    // notify, autoreply, telegram: #59 · ga: #62
  };
}

/** Where operational alerts go besides Workers Logs. Email and Telegram arrive in #59. */
export function alertTransports(env: Env): AlertTransport[] {
  void env;
  return [];
}
