// The lead contract, shared by the form (client-side errors) and /api/lead (the check that counts).
// Anti-bot fields (Turnstile token, honeypot, render time) are checked by the endpoint, not here.
import { z } from 'zod';
import { budgetBands, currencies, serviceOptions, timelines, workModes } from '../data/lead';

export const limits = { name: 100, email: 254, company: 100, message: 2000, url: 500, short: 200 };

const values = (options: readonly { value: string }[]) => options.map((o) => o.value);

function oneOf(options: readonly { value: string }[], message: string) {
  const allowed = values(options);
  return z.string().refine((v) => allowed.includes(v), { message });
}

const requiredText = (max: number, message: string) =>
  z
    .string({ error: message })
    .trim()
    .min(1, { message })
    .max(max, { message: `Keep it under ${max} characters` });

// Empty inputs arrive as '' from forms; store them as absent.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Keep it under ${max} characters` })
    .optional()
    .transform((v) => v || undefined);

const common = {
  name: requiredText(limits.name, 'Please add your name'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(limits.email)
    .pipe(z.email({ message: 'Please add a valid email address' })),
  consent: z.literal(true, { error: 'Please agree so I can reply to you' }),
  // First-touch attribution captured by the form. Never shown to the visitor, so invalid values are dropped.
  source_page: optionalText(limits.short),
  utm_source: optionalText(limits.short),
  utm_medium: optionalText(limits.short),
  utm_campaign: optionalText(limits.short),
  referrer: optionalText(limits.url),
  // GA4 client id ("123.456"), present only when analytics consent was given.
  ga_client_id: z
    .string()
    .regex(/^\d{1,20}\.\d{1,20}$/)
    .optional()
    .catch(undefined),
  // GA4 session id (a unix timestamp), so the server-side conversion joins the visitor's session.
  ga_session_id: z
    .string()
    .regex(/^\d{1,20}$/)
    .optional()
    .catch(undefined),
  // Browser flags from ?debug=1 / ?internal=1: send the conversion to DebugView, and mark it as my
  // own traffic. Never set for real visitors.
  ga_debug: z.literal('1').optional().catch(undefined),
  ga_internal: z.literal('1').optional().catch(undefined),
};

const project = z
  .object({
    path: z.literal('project'),
    ...common,
    company: optionalText(limits.company),
    service: oneOf(serviceOptions, 'Please choose what you need'),
    currency: oneOf(currencies, 'Please choose a currency'),
    budget: z.string({ error: 'Please choose a budget range' }),
    timeline: oneOf(timelines, 'Please choose a timeline'),
    message: requiredText(limits.message, 'Please tell me a little about the project'),
  })
  .refine((l) => values(budgetBands[l.currency as keyof typeof budgetBands]).includes(l.budget), {
    message: 'Please choose a budget range',
    path: ['budget'],
  });

const role = z.object({
  path: z.literal('role'),
  ...common,
  company: requiredText(limits.company, 'Please add the company name'),
  role_title: requiredText(limits.short, 'Please add the role title'),
  work_mode: oneOf(workModes, 'Please choose how the role is set up'),
  job_url: optionalText(limits.url).pipe(
    z.url({ protocol: /^https?$/, message: 'Please add a full link (https://…)' }).optional(),
  ),
  message: optionalText(limits.message),
});

export const leadSchema = z.discriminatedUnion('path', [project, role]);

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;
export type LeadPath = Lead['path'];
