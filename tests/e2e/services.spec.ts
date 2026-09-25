import { expect, test } from '@playwright/test';
import { services } from '../../src/data/services';

test('services page lists every service and matching FAQ structured data', async ({ page }) => {
  await page.goto('/services');
  await expect(page.locator('main > div ul > li[id]')).toHaveCount(services.length);

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

for (const service of services.filter((s) => s.page)) {
  const path = `/services/${service.id}`;

  test(`${path} is a complete landing page, linked from /services`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(service.page!.heading);
    await expect(page.locator('main a[href="/contact"]').first()).toBeVisible();

    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    const graph: { '@type': string }[] = jsonLd['@graph'];
    expect(graph.find((node) => node['@type'] === 'Service')).toMatchObject({
      name: service.title,
      url: `https://abhishekgoyal.me${path}`,
    });
    const faq = graph.find((node) => node['@type'] === 'FAQPage') as unknown as {
      mainEntity: { name: string }[];
    };
    const visibleQuestions = await page.locator('#faq details summary').allInnerTexts();
    expect(visibleQuestions.map((q) => q.replace(/\s*\+\s*$/, '').trim())).toEqual(
      faq.mainEntity.map((q) => q.name),
    );

    await page.goto('/services');
    await expect(page.locator(`#${service.id} a[href="${path}"]`).first()).toBeVisible();
  });
}
