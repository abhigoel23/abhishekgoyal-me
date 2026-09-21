import { expect, test } from '@playwright/test';

test('services page lists four services and matching FAQ structured data', async ({ page }) => {
  await page.goto('/services');
  await expect(page.locator('main > div ul > li[id]')).toHaveCount(4);

  const visibleQuestions = await page.locator('#faq details summary').allInnerTexts();
  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  );
  const faq = jsonLd['@graph'].find((node: { '@type': string }) => node['@type'] === 'FAQPage');
  const structuredQuestions = faq.mainEntity.map((q: { name: string }) => q.name);

  expect(structuredQuestions.length).toBeGreaterThan(0);
  expect(visibleQuestions.map((q) => q.replace(/\s*\+\s*$/, '').trim())).toEqual(
    structuredQuestions,
  );
});

test('FAQ answers open with the keyboard', async ({ page }) => {
  await page.goto('/services');
  const first = page.locator('#faq details').first();
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('open', '');
});
