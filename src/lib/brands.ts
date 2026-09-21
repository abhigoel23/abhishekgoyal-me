// Brand directions for M1. Each one is a full token set (light + dark) plus typography.
// After Abhishek picks one (#26), the other two are deleted and this stays the token source of truth.

export type ThemeTokens = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
  focus: string;
};

// Must match the cssVariable names configured under `fonts` in astro.config.mjs.
export type FontVar =
  | '--font-fraunces'
  | '--font-inter'
  | '--font-instrument-serif'
  | '--font-inter-tight'
  | '--font-jetbrains-mono';

export type Brand = {
  id: 'editorial' | 'studio' | 'engineer';
  letter: string;
  name: string;
  summary: string;
  pros: string[];
  cons: string[];
  fonts: { display: FontVar; body: FontVar; mono: FontVar; labels: string };
  shape: {
    radius: string;
    displayWeight: number;
    displayTracking: string;
    /** Eyebrow/label style: 'mono' uses the mono face in caps, 'serif-italic' the display face in italic. */
    eyebrow: 'mono' | 'sans' | 'serif-italic';
  };
  light: ThemeTokens;
  dark: ThemeTokens;
};

export const brands: Brand[] = [
  {
    id: 'editorial',
    letter: 'A',
    name: 'Editorial',
    summary:
      'Warm paper, a soft variable serif and a terracotta accent. Reads like a craftsperson’s notebook.',
    pros: [
      'Closest to the approved brief: editorial and warm',
      'Personal and human; suits a “one engineer, end to end” story',
      'Fraunces has real weight and optical-size range for hierarchy',
    ],
    cons: [
      'Warm serifs are common on personal sites',
      'Less of an instant “engineer” signal for hiring managers',
    ],
    fonts: {
      display: '--font-fraunces',
      body: '--font-inter',
      mono: '--font-jetbrains-mono',
      labels: 'Fraunces · Inter',
    },
    shape: {
      radius: '0.875rem',
      displayWeight: 420,
      displayTracking: '-0.02em',
      eyebrow: 'serif-italic',
    },
    light: {
      bg: '#FAF6EF',
      surface: '#F1E9DC',
      ink: '#1C1A17',
      muted: '#5C554B',
      line: '#E0D5C3',
      accent: '#A3401D',
      onAccent: '#FFFFFF',
      focus: '#A3401D',
    },
    dark: {
      bg: '#16130F',
      surface: '#221D18',
      ink: '#F3EDE3',
      muted: '#B3A999',
      line: '#3A332B',
      accent: '#E8875C',
      onAccent: '#1C120C',
      focus: '#E8875C',
    },
  },
  {
    id: 'studio',
    letter: 'B',
    name: 'Studio',
    summary:
      'Cool off-white, a high-contrast display serif and the resume’s deep blue. Calm and premium.',
    pros: [
      'Premium and calm; reads well to consulting buyers',
      'Continues the resume’s #1F4E79 blue, so the PDF and site match',
      'Sharp corners and restraint age well',
    ],
    cons: [
      'Instrument Serif has one weight, so hierarchy leans on size and italics',
      'Cooler and more formal; less personality than A',
    ],
    fonts: {
      display: '--font-instrument-serif',
      body: '--font-inter',
      mono: '--font-jetbrains-mono',
      labels: 'Instrument Serif · Inter',
    },
    shape: { radius: '0.25rem', displayWeight: 400, displayTracking: '-0.01em', eyebrow: 'sans' },
    light: {
      bg: '#F6F6F3',
      surface: '#ECECE6',
      ink: '#14171C',
      muted: '#535963',
      line: '#D9D9D1',
      accent: '#1F4E79',
      onAccent: '#FFFFFF',
      focus: '#1F4E79',
    },
    dark: {
      bg: '#0E1116',
      surface: '#171B22',
      ink: '#ECEEF1',
      muted: '#A2A9B3',
      line: '#2A303A',
      accent: '#8DB8E8',
      onAccent: '#0B1522',
      focus: '#8DB8E8',
    },
  },
  {
    id: 'engineer',
    letter: 'C',
    name: 'Engineer',
    summary:
      'Neutral white, a tight grotesk, mono details and a green accent. Technical without the neon terminal.',
    pros: [
      'Signals “engineer” at a glance; strongest for employer audiences',
      'Mono labels suit case studies full of stack names',
      'Keeps a nod to the old site without its neon look',
    ],
    cons: [
      'Moves away from the brief’s serif display type',
      'Grotesk + mono is a common dev-portfolio look; less distinctive',
    ],
    fonts: {
      display: '--font-inter-tight',
      body: '--font-inter',
      mono: '--font-jetbrains-mono',
      labels: 'Inter Tight · Inter · JetBrains Mono',
    },
    shape: { radius: '0.5rem', displayWeight: 640, displayTracking: '-0.035em', eyebrow: 'mono' },
    light: {
      bg: '#FFFFFF',
      surface: '#F3F5F4',
      ink: '#0F1411',
      muted: '#525A55',
      line: '#E0E4E1',
      accent: '#15714A',
      onAccent: '#FFFFFF',
      focus: '#15714A',
    },
    dark: {
      bg: '#0C0F0D',
      surface: '#151A17',
      ink: '#E8ECE9',
      muted: '#9BA59F',
      line: '#262D29',
      accent: '#4CC38A',
      onAccent: '#06140D',
      focus: '#4CC38A',
    },
  },
];

export function getBrand(id: string): Brand {
  const brand = brands.find((b) => b.id === id);
  if (!brand) throw new Error(`Unknown brand: ${id}`);
  return brand;
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Colour tokens as CSS declarations, e.g. `--bg:#FAF6EF;--on-accent:#fff;` */
export function colorVars(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([key, value]) => `--${kebab(key)}:${value};`)
    .join('');
}

/** Theme-independent brand declarations: fonts and shape. */
export function brandVars(brand: Brand): string {
  const { fonts, shape } = brand;
  return [
    `--brand-display:var(${fonts.display});`,
    `--brand-body:var(${fonts.body});`,
    `--brand-mono:var(${fonts.mono});`,
    `--brand-radius:${shape.radius};`,
    `--display-weight:${shape.displayWeight};`,
    `--display-tracking:${shape.displayTracking};`,
  ].join('');
}
