import { expect, test, type Page } from '@playwright/test';

// case_study_read (#112): end of the text in view AND 20 s on the page. gtag never loads off the
// production hosts, so a stub records what track() would send.
async function openCaseStudy(page: Page) {
  await page.clock.install();
  await page.addInitScript(() => {
    const events: unknown[] = [];
    Object.assign(window, {
      __events: events,
      gtag: (...args: unknown[]) => events.push(args),
    });
  });
  await page.goto('/work/helperbook');
}

const reads = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { __events: unknown[][] }).__events ?? []).filter(
      (e) => e[1] === 'case_study_read',
    ),
  );

test('reaching the end after 20 s sends case_study_read once, with the slug', async ({ page }) => {
  await openCaseStudy(page);
  await page.clock.runFor(21_000);
  await page.locator('[data-case-study-end]').scrollIntoViewIfNeeded();
  await expect
    .poll(() => reads(page))
    .toEqual([['event', 'case_study_read', { case_study: 'helperbook' }]]);

  await page.mouse.wheel(0, -5000);
  await page.locator('[data-case-study-end]').scrollIntoViewIfNeeded();
  await page.clock.runFor(1_000);
  expect(await reads(page)).toHaveLength(1);
});

test('a quick scroll to the end only counts once 20 s have passed there', async ({ page }) => {
  await openCaseStudy(page);
  await page.locator('[data-case-study-end]').scrollIntoViewIfNeeded();
  await page.clock.runFor(5_000);
  expect(await reads(page)).toHaveLength(0);
  await page.clock.runFor(16_000);
  await expect.poll(() => reads(page)).toHaveLength(1);
});

test('scrolling away before 20 s cancels the pending read', async ({ page }) => {
  await openCaseStudy(page);
  await page.locator('[data-case-study-end]').scrollIntoViewIfNeeded();
  await page.clock.runFor(2_000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.clock.runFor(30_000);
  expect(await reads(page)).toHaveLength(0);
});
