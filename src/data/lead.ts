// Lead form options. Values are stored in D1 and the Sheet, so change a value only with a migration plan;
// labels can change freely. Budget bands were set by Abhishek (2026-09-22).
import { profile } from './profile';
import { services } from './services';

export const leadPaths = [
  { value: 'project', label: 'A project for my product or team' },
  { value: 'role', label: 'A full-time role' },
] as const;

// A third choice on the /contact form that isn't an enquiry: it signs up to the newsletter (#111), so it
// posts to /api/subscribe and is never stored as a lead.
export const followingPath = { value: 'following', label: 'Just following along' } as const;
export const contactPaths = [...leadPaths, followingPath] as const;

export const serviceOptions = [
  ...services.map((s) => ({ value: s.id, label: s.title })),
  { value: 'unsure', label: 'Not sure yet' },
];

export const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'INR', label: 'INR (₹)' },
] as const;

export const budgetBands = {
  USD: [
    { value: 'usd-lt5k', label: 'Under $5k' },
    { value: 'usd-5-15k', label: '$5k–15k' },
    { value: 'usd-15-40k', label: '$15k–40k' },
    { value: 'usd-40k-plus', label: '$40k+' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
  INR: [
    { value: 'inr-lt4l', label: 'Under ₹4L' },
    { value: 'inr-4-12l', label: '₹4L–12L' },
    { value: 'inr-12-30l', label: '₹12L–30L' },
    { value: 'inr-30l-plus', label: '₹30L+' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
} as const;

export const timelines = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1-3m', label: 'In 1–3 months' },
  { value: '3m-plus', label: 'In 3+ months' },
  { value: 'exploring', label: 'Just exploring' },
] as const;

export const workModes = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid-ncr', label: 'Hybrid or on-site in Delhi NCR' },
] as const;

// Copy for the /contact form (src/components/react/LeadForm.tsx). Kept in data, not the component.
export const formCopy = {
  pathLegend: 'What brings you here?',
  pathError: 'Please choose one',
  labels: {
    name: 'Your name',
    email: 'Email',
    company: 'Company',
    service: 'What do you need?',
    currency: 'Currency',
    budget: 'Budget',
    timeline: 'Timeline',
    message: 'Tell me about the project',
    roleMessage: 'Anything else? (optional)',
    roleTitle: 'Role title',
    workMode: 'How is the role set up?',
    jobUrl: 'Job link (optional)',
    honeypot: 'Leave this empty',
  },
  // Rendered as: `{consentPrefix}` + a link labelled `{consentLinkText}` + `.`
  consentPrefix: 'I agree to be contacted about this enquiry. See the ',
  consentLinkText: 'privacy policy',
  hints: {
    message: 'A few lines is plenty: what you need, by when, and what exists today.',
    jobUrl: 'A link to the job post or listing, if there is one.',
  },
  submit: 'Send enquiry',
  submitting: 'Sending…',
  errors: {
    rateLimited: 'Too many attempts, try again in a minute.',
    unavailable: `The form isn't available right now. Email ${profile.email} instead.`,
    rejected: `That submission couldn't be sent. Email ${profile.email} instead.`,
    verificationFailed: 'Verification failed, please try again.',
    generic: `Something went wrong. Email ${profile.email} instead.`,
  },
} as const;

// "What happens next" list, shown beside the form and reused on /thanks.
export const nextSteps = [
  'I read every message myself and reply within 2 working days.',
  'If it looks like a fit, we set up a 20-minute intro call.',
] as const;

// /thanks copy. `default` shows before a small inline script reads ?path= and swaps in the project/role
// line (both say the same thing either way, so there's no flash of wrong content).
export const thanksCopy = {
  heading: 'Thanks — your message is in.',
  default: 'I read every message myself and reply within 2 working days.',
  project: 'I read every enquiry myself and will reply about your project within 2 working days.',
  role: 'I read every message myself and will reply about the role within 2 working days.',
} as const;

// Intro-call booking on Cal.com (#60). A plain link rather than Cal's embed script: no third-party JS
// on our pages until the visitor chooses to book, and it works without JavaScript.
export const bookCall = {
  href: 'https://cal.com/abhishek-goyal/intro-call',
  label: 'Book a 20-minute intro call',
  note: 'Opens Cal.com in a new tab.',
  contactLead: 'Prefer to talk first?',
  thanksLead: 'Want to talk sooner? Pick a time that suits you.',
} as const;
