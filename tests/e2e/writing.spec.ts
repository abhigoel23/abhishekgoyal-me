import { expect, test } from '@playwright/test';

test('the writing index lists posts, and each post has valid BlogPosting data', async ({
  page,
  request,
}) => {
  const response = await page.goto('/writing');
  expect(response?.status()).toBe(200);
  const links = await page
    .locator('main a[href^="/writing/"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  expect(links.length).toBeGreaterThan(0);

  for (const href of links) {
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const graph = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    )['@graph'] as Record<string, unknown>[];
    const post = graph.find((node) => node['@type'] === 'BlogPosting');
    expect(post, href).toBeTruthy();
    expect(post!.headline).toBe(await page.getByRole('heading', { level: 1 }).textContent());
    expect(post!.url).toBe(`https://abhishekgoyal.me${href}`);
    const image = await request.get(new URL(String(post!.image)).pathname);
    expect(image.headers()['content-type'], `${href} og image`).toBe('image/png');
  }
});
