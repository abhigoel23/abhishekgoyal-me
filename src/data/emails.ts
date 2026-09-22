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
