import { defineConfig } from 'vitest/config';

// Plain Vitest (not Astro's getViteConfig): unit tests cover pure TS modules and must not
// boot the Cloudflare runtime.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    reporters: ['dot'],
  },
});
