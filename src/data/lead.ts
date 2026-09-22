// Lead form options. Values are stored in D1 and the Sheet, so change a value only with a migration plan;
// labels can change freely. Budget bands were set by Abhishek (2026-09-22).
import { services } from './services';

export const leadPaths = [
  { value: 'project', label: 'A project for my product or team' },
  { value: 'role', label: 'A full-time role' },
] as const;

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
  { value: 'relocation', label: 'Relocation abroad' },
] as const;
