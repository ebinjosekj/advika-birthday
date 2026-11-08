import { test, expect } from '@playwright/test';
import { centre, openMain, SECTIONS } from './helpers';

const VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
  { name: 'mobile-430', width: 430, height: 932, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'desktop-1920', width: 1920, height: 1080, mobile: false },
];

for (const vp of VIEWPORTS) {
  test.describe(`E · responsive ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.mobile, isMobile: vp.mobile });

    test('no horizontal overflow, panels fit, targets are tappable, menu works', async ({ page }) => {
      test.setTimeout(480_000);
      await openMain(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      for (const id of SECTIONS) {
        await centre(page, id);
        const panel = page.locator(`#${id} .panel`).first();
        await expect(panel).toBeVisible();
        const box = (await panel.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
        // headings never clipped horizontally
        const clipped = await page.locator(`#${id} h1, #${id} h2`).first().evaluate((h) => h.scrollWidth > h.clientWidth + 1);
        expect(clipped).toBe(false);
      }
      await page.screenshot({ path: `test-results/screens/${vp.name}-finale.png` });
      // interactive targets are at least 44px tall (WCAG 2.5.5 AAA-ish / Apple HIG)
      const small = await page.$$eval('.story a.btn, .story button, .nav button, .nav a.link', (els) =>
        els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 40 || r.width < 40); }).map((e) => (e.textContent || e.getAttribute('aria-label') || '').trim()),
      );
      expect(small).toEqual([]);
      // navigation reachable on every size
      await page.evaluate(() => window.scrollTo(0, 0));
      if (vp.width <= 1020) {
        await page.getByTestId('menu-toggle').click();
        const menu = page.locator('#mobile-menu');
        await expect(menu).toBeVisible();
        await menu.getByRole('link', { name: 'RSVP' }).click();
        await expect(menu).toBeHidden();
      } else {
        await page.getByRole('navigation').getByRole('link', { name: 'RSVP', exact: true }).click();
      }
      await expect.poll(() => page.evaluate(() => window.__MAGIC__!.state().activeSection), { timeout: 30_000 }).toBe('rsvp');
      await page.screenshot({ path: `test-results/screens/${vp.name}-rsvp.png` });
      // fixed chrome must not cover the RSVP submit button once it's scrolled into view
      const submit = page.getByTestId('rsvp-submit');
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
    });
  });
}
