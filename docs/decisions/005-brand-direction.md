# 005 — Brand direction: Studio

**Status:** accepted · 2026-09-21

Three directions were built as live style guides on the PR #35 preview. They were A. Editorial (Fraunces, terracotta), B. Studio (Instrument Serif, deep blue) and C. Engineer (Inter Tight + mono, green). Abhishek picked **B. Studio**: Instrument Serif for display, Inter for body, JetBrains Mono for code, a cool off-white or graphite base, and the resume's `#1F4E79` blue as the only accent (`#8DB8E8` in dark), with 4px corners. It reads calm and premium to consulting buyers, and it matches the resume PDF, so the site and resume look like one brand. The trade-off is that Instrument Serif has a single weight, so hierarchy comes from size, italics and spacing rather than weight. Tokens live in `src/lib/theme.ts`, a unit test enforces WCAG AA for every text pair in both themes, and `/styleguide` (noindex) is the living reference.
