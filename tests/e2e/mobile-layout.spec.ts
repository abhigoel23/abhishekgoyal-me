// Mobile layout checks on every page (#177): no sideways scrolling, tap targets that meet WCAG 2.2 AA,
// form fields iOS won't zoom into, and long strings that wrap instead of widening the page.
import { expect, test } from '@playwright/test';
import { routes } from './routes';

// Viewport sizes are set per test, so the desktop project is enough.
test.skip(({ isMobile }) => isMobile, 'viewport sizes are set per test');

const WIDTHS = [320, 375, 390, 430];

for (const path of routes) {
  test(`${path}: no horizontal overflow at ${WIDTHS.join(', ')} px`, async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const [scroll, inner] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        window.innerWidth,
      ]);
      expect(scroll, `${path} at ${width} px`).toBeLessThanOrEqual(inner);
    }
  });

  test(`${path}: tap targets meet WCAG 2.5.8 at 375 px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path);
    const failures = await page.evaluate(() => {
      type Box = { el: Element; label: string; x: number; y: number; w: number; h: number };
      const MIN = 24;
      const boxes: Box[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(
        'a[href], button, summary, input:not([type="hidden"]), select, textarea',
      )) {
        // Not for people: e.g. the forms' honeypot field sits in an aria-hidden wrapper.
        if (el.closest('[aria-hidden="true"]')) continue;
        // Inline links in running text are exempt (2.5.8 "inline" exception).
        if (
          el.closest('.prose') ||
          (el.tagName === 'A' && el.closest('p, li') && getComputedStyle(el).display === 'inline')
        ) {
          const parentText = (el.closest('p, li')?.textContent ?? '').trim();
          if (parentText.length > (el.textContent ?? '').trim().length + 3) continue;
        }
        // A radio or checkbox is operated through its label too, so measure both together.
        let target: Element = el;
        if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) {
          target =
            el.closest('label') ??
            (el.id ? document.querySelector(`label[for="${el.id}"]`) : null) ??
            el;
        }
        const r = target.getBoundingClientRect();
        const s = getComputedStyle(el);
        // Skip things that aren't on screen: hidden, or visually hidden until focused (skip link).
        if (r.width <= 1 || r.height <= 1 || s.visibility === 'hidden' || s.display === 'none')
          continue;
        const label = (el.textContent || el.getAttribute('aria-label') || el.tagName)
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 40);
        boxes.push({
          el,
          label,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          w: r.width,
          h: r.height,
        });
      }
      const small = boxes.filter((b) => b.w < MIN || b.h < MIN);
      // Spacing exception: a 24 px circle centred on an undersized target must not touch another target.
      const intersectsRect = (c: Box, o: Box) => {
        const dx = Math.max(Math.abs(c.x - o.x) - o.w / 2, 0);
        const dy = Math.max(Math.abs(c.y - o.y) - o.h / 2, 0);
        return dx * dx + dy * dy < (MIN / 2) ** 2;
      };
      return small
        .filter((c) =>
          boxes.some(
            (o) =>
              o !== c &&
              !o.el.contains(c.el) &&
              !c.el.contains(o.el) &&
              (small.includes(o) ? Math.hypot(c.x - o.x, c.y - o.y) < MIN : intersectsRect(c, o)),
          ),
        )
        .map((b) => `${Math.round(b.w)}×${Math.round(b.h)} "${b.label}"`);
    });
    expect(failures, `${path}: targets under 24 px that crowd another target`).toEqual([]);
  });
}

test('buttons, fields and the menu toggle are at least 44 px tall', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/', '/services', '/contact', '/checklist', '/hire']) {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'main button, main select, main input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), main textarea, header summary, main a[class*="min-h-"]',
        ),
      ]
        .filter((el) => !el.closest('[aria-hidden="true"]'))
        .filter((el) => el.getBoundingClientRect().height > 0)
        .filter((el) => el.getBoundingClientRect().height < 44)
        .map(
          (el) =>
            `${Math.round(el.getBoundingClientRect().height)} px "${(el.textContent || el.getAttribute('name') || el.tagName).trim().slice(0, 30)}"`,
        ),
    );
    expect(small, path).toEqual([]);
  }
});

test('form fields use 16 px text or more, so iOS Safari does not zoom on focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/contact', '/checklist']) {
    // The forms are server-rendered, so their CSS applies before the islands hydrate.
    await page.goto(path);
    const small = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), select, textarea',
        ),
      ]
        .filter((el) => !el.closest('[aria-hidden="true"]'))
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => `${getComputedStyle(el).fontSize} ${el.getAttribute('name') ?? el.tagName}`),
    );
    expect(small, path).toEqual([]);
  }
});

test('long words and URLs wrap in posts instead of widening the page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/writing/offline-first-sync-lessons');
  const wrap = await page.locator('article.prose').evaluate((el) => {
    el.insertAdjacentHTML(
      'beforeend',
      '<p>https://example.com/a-very-long-unbroken-address-that-must-wrap-on-a-small-phone-screen-without-scrolling</p>',
    );
    return [document.documentElement.scrollWidth, window.innerWidth];
  });
  expect(wrap[0]).toBeLessThanOrEqual(wrap[1]!);
});
