import { expect, test } from '@playwright/test';
import { checklist, checklistPage, checklistPdf } from '../../src/data/checklist';

// Not live yet (#111 ships the sign-up form): both routes stay noindex and out of the sitemap.

test('/checklist renders the landing page and the sign-up placeholder', async ({ page }) => {
  await page.goto('/checklist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(checklistPage.title);
  for (const section of checklist.sections) {
    await expect(page.getByText(section.title, { exact: true })).toBeVisible();
  }
  const slot = page.locator('#checklist-signup[data-signup-slot]');
  await expect(slot).toBeVisible();
  await expect(slot).toContainText(checklistPage.formNote);
  await expect(slot).toContainText(checklistPage.soon);
});

test('/checklist and /checklist/print are noindex', async ({ page }) => {
  for (const path of ['/checklist', '/checklist/print']) {
    await page.goto(path);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  }
});

test('/checklist and /checklist/print are excluded from the sitemap', async ({ request }) => {
  const response = await request.get('/sitemap-0.xml');
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).not.toContain('/checklist');
});

test('the checklist PDF is served, non-trivial and noindex', async ({ request }) => {
  const response = await request.get(checklistPdf);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
  expect(body.length).toBeGreaterThan(20 * 1024);
});
