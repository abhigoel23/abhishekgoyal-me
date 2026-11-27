// Design tokens: the light editorial palette in docs/decisions/007-light-editorial.md (fonts, accent and
// radius from the Studio direction, ADR 005).
// Base.astro writes these as CSS variables; global.css maps them to Tailwind utilities.

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
export type FontVar = '--font-instrument-serif' | '--font-inter' | '--font-jetbrains-mono';

export const fonts: { display: FontVar; body: FontVar; mono: FontVar; label: string } = {
  display: '--font-instrument-serif',
  body: '--font-inter',
  mono: '--font-jetbrains-mono',
  label: 'Instrument Serif · Inter · JetBrains Mono',
};

export const shape = { radius: '0.25rem', displayWeight: 400, displayTracking: '-0.01em' };

// Light is the default: white cards on a warm off-white page, separated by 1px lines rather than shadows.
export const light: ThemeTokens = {
  bg: '#FAF9F6',
  surface: '#FFFFFF',
  ink: '#0F172A',
  muted: '#475569',
  line: '#DEDBD2',
  accent: '#1F4E79',
  onAccent: '#FFFFFF',
  focus: '#1F4E79',
};

// Kept for people who choose it: cards sit one step above the page, as in light.
export const dark: ThemeTokens = {
  bg: '#0E1116',
  surface: '#171B22',
  ink: '#ECEEF1',
  muted: '#A2A9B3',
  line: '#2A303A',
  accent: '#8DB8E8',
  onAccent: '#0B1522',
  focus: '#8DB8E8',
};

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Colour tokens as CSS declarations, e.g. `--bg:#F6F6F3;--on-accent:#FFFFFF;` */
export function colorVars(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([key, value]) => `--${kebab(key)}:${value};`)
    .join('');
}

/** The full stylesheet for the tokens: light by default, dark when chosen or when the OS prefers it. */
export function themeCss(): string {
  const base = [
    `--brand-display:var(${fonts.display});`,
    `--brand-body:var(${fonts.body});`,
    `--brand-mono:var(${fonts.mono});`,
    `--brand-radius:${shape.radius};`,
    `--display-weight:${shape.displayWeight};`,
    `--display-tracking:${shape.displayTracking};`,
  ].join('');
  return `:root{${base}${colorVars(light)}}
:root[data-theme='dark']{${colorVars(dark)}}
@media (prefers-color-scheme: dark){:root:not([data-theme='light']){${colorVars(dark)}}}`;
}
