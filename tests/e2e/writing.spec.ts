import { expect, test } from '@playwright/test';
import { writingCopy } from '../../src/data/writing';

test('writing index loads with the empty state and is noindex while there are no posts', async ({
  page,
}) => {
  const response = await page.goto('/writing');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: writingCopy.empty.title })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
