// Email and Telegram copy for lead delivery (src/lib/server/notifications.ts). Plain text only.
// The reply-time promise was confirmed by Abhishek (2026-09-22); keep it in step with src/data/lead.ts.
import { profile } from './profile';

export const sender = {
  from: `${profile.name} <${profile.email}>`,
  notifyFrom: `abhishekgoyal.me leads <${profile.email}>`,
  inbox: profile.email,
};

const signature = [profile.name, `${profile.jobTitle} · ${new URL(profile.url).host}`];

const footer = [
  '—',
  `You're receiving this because you used the contact form on ${new URL(profile.url).host}.`,
  'To have your details erased, reply to this email with DELETE.',
];

export const autoReply = {
  project: (firstName: string) => ({
    subject: `Thanks for getting in touch, ${firstName}`,
    lines: [
      `Hi ${firstName},`,
      '',
      'Thanks for telling me about your project. I read every enquiry myself and will reply within 2 working days.',
      '',
      'If it looks like a fit, the next step is a 20-minute intro call.',
    ],
  }),
  role: (firstName: string, roleTitle: string, company: string) => ({
    subject: `Thanks for getting in touch, ${firstName}`,
    lines: [
      `Hi ${firstName},`,
      '',
      `Thanks for reaching out about the ${roleTitle} role at ${company}. I read every message myself and will reply within 2 working days.`,
    ],
  }),
  signature,
  footer,
};

// Double opt-in (#109). The link is /subscribe/confirm#t=<token>; the page has a Confirm button, so a
// mail scanner opening the link confirms nothing.
export const confirmSubscription = {
  subject: 'Confirm your email to get the checklist',
  lines: (link: string) => [
    'Hi,',
    '',
    "Please confirm your email address and I'll send you the Offline-first Android launch checklist:",
    '',
    link,
    '',
    'The link works for 7 days. Once you confirm, I may also send occasional notes on what I am',
    'building; every one has an unsubscribe link.',
    '',
    "If you didn't ask for this, ignore this email and you won't hear from me.",
  ],
  signature,
  footer: [
    '—',
    `You're receiving this because this address was entered on ${new URL(profile.url).host}.`,
  ],
};

// Sent once the address is confirmed (#110): the checklist link. The PDF itself is public and noindex.
export const checklistDelivery = {
  subject: 'Your Offline-first Android launch checklist',
  lines: (pdfUrl: string) => [
    'Hi,',
    '',
    "Thanks for confirming. Here's the checklist:",
    '',
    pdfUrl,
    '',
    'If one of the checks raises a question about your own app, reply to this email. I read every reply.',
  ],
  signature,
  footer: [
    '—',
    `You're receiving this because you signed up on ${new URL(profile.url).host}.`,
    'Occasional notes come with an unsubscribe link. To be removed now, reply with UNSUBSCRIBE.',
  ],
};

export const notify = {
  project: (name: string, budget: string) => `New project lead: ${name} · ${budget}`,
  role: (company: string, roleTitle: string) => `New role enquiry: ${company} · ${roleTitle}`,
  intro: 'Reply to this email to answer the lead directly. The row is in the Leads Sheet.',
};

// Telegram gets NO personal details: path, budget/timeline or work mode only.
export const telegram = {
  project: (budget: string, timeline: string) =>
    `🆕 New project lead · ${budget} · ${timeline} · see Sheet`,
  role: (workMode: string) => `🆕 New role enquiry · ${workMode} · see Sheet`,
  alert: (subject: string) => `⚠️ ${subject}`,
};
