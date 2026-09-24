// The newsletter sign-up contract, shared by the forms (client-side errors) and /api/subscribe (the
// check that counts). Anti-bot fields are checked by the endpoint, as for leads.
import { z } from 'zod';
import { attribution, emailField } from './lead';

/** Where a sign-up came from. Stored in D1 and the Sheet, so change values only with a migration plan. */
export const subscribeSources = ['checklist', 'footer', 'lead_form'] as const;

export const subscribeSchema = z.object({
  email: emailField,
  consent: z.literal(true, { error: 'Please agree so I can email you' }),
  source: z.enum(subscribeSources),
  ...attribution,
});

export type SubscribeInput = z.input<typeof subscribeSchema>;
export type Subscribe = z.output<typeof subscribeSchema>;

/** The confirm link carries the token in the URL fragment, which never reaches servers or analytics. */
export const confirmTokenPattern = /^[A-Za-z0-9_-]{43}$/;
