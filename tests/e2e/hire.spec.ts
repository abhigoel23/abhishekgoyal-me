import { expect, test } from '@playwright/test';

test('hire page links to the resume page, the PDF and email', async ({ page }) => {
  await page.goto('/hire');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hiring a mobile engineer?');
  await expect(page.getByRole('link', { name: 'Download resume (PDF)' })).toHaveAttribute(
    'href',
    '/resume.pdf',
  );
  await expect(page.getByRole('link', { name: 'View resume online' })).toHaveAttribute(
    'href',
    '/resume',
  );
  await expect(page.getByRole('link', { name: /Request an interview/ }).first()).toHaveAttribute(
    'href',
    '/contact?path=role',
  );
});

test('the resume PDF is served', async ({ request }) => {
  const response = await request.get('/resume.pdf');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('the public resume never shows a phone number', async ({ page }) => {
  await page.goto('/resume');
  await expect(page.locator('[data-phone]')).toBeEmpty();
  await expect(page.locator('main')).not.toContainText(/\+\d{2}\s?\d{4,}/);
});
