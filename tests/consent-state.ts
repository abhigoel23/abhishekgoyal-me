// Browsers in the e2e suites start with analytics already declined: the consent bar would otherwise
// cover buttons near the bottom of the page, and smoke runs against production must never load GA.
// tests/e2e/consent.spec.ts opts out to test the bar itself.
export function declinedConsent(baseURL: string) {
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(baseURL).origin,
        localStorage: [
          { name: 'consent', value: JSON.stringify({ choice: 'denied', at: Date.now() }) },
        ],
      },
    ],
  };
}
