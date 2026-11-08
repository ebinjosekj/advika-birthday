import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { centre, openMain, state } from './helpers';

test.describe('F · accessibility', () => {
  test('axe: no serious/critical violations in the main experience', async ({ page }) => {
    await openMain(page);
    const res = await new AxeBuilder({ page }).include('#story').include('nav').exclude('canvas').analyze();
    const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    if (bad.length) console.log(JSON.stringify(bad.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target) })), null, 1));
    expect(bad).toEqual([]);
  });

  test('keyboard: skip link, nav, visible focus, form operable without a mouse', async ({ page }) => {
    await openMain(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to RSVP' })).toBeFocused();
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), tag: el.tagName };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
    // Activate the RSVP nav link with Enter; focus lands on the RSVP heading
    await page.getByRole('navigation').getByRole('link', { name: 'RSVP', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#rsvp-title')).toBeFocused({ timeout: 30_000 });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.insertText('Keyboard Guest');
    await expect(page.getByTestId('rsvp-form').getByLabel('Your name')).toHaveValue('Keyboard Guest');
  });

  test('form fields have labels and errors are announced', async ({ page }) => {
    await openMain(page);
    await centre(page, 'rsvp');
    const form = page.getByTestId('rsvp-form');
    for (const label of ['Your name', 'Number of attendees (including you)', 'A birthday message for Advika (optional)']) await expect(form.getByLabel(label)).toBeVisible();
    await form.getByTestId('rsvp-submit').click();
    await expect(form.getByRole('alert').first()).toBeVisible();
    await expect(form.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('all buttons and links have accessible names; 3D canvas is hidden from AT', async ({ page }) => {
    await openMain(page);
    const unnamed = await page.$$eval('button, a[href]', (els) => els.filter((e) => !(e.getAttribute('aria-label') || e.textContent || '').trim()).map((e) => e.outerHTML.slice(0, 80)));
    expect(unnamed).toEqual([]);
    await expect(page.getByTestId('world-canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  test('reduced motion: no camera flight, intro jumps straight to the reveal', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/?quality=low&renderScale=0.4');
    await page.getByTestId('open-book').click({ timeout: 90_000 });
    await expect(page.getByTestId('reveal')).toBeVisible({ timeout: 15_000 });
    expect((await state(page)).intro.cam).toBe(1);
    // the reveal auto-continues after a few seconds; click if it is still showing
    await page.getByTestId('enter-main').click({ timeout: 3000 }).catch(() => {});
    await expect.poll(async () => (await state(page)).phase).toBe('main');
    expect(await page.evaluate(() => window.__MAGIC__!.state().reducedMotion)).toBe(true);
    // camera snaps to whole stations instead of gliding
    await centre(page, 'birthday');
    await page.waitForTimeout(1500);
    const z1 = (await state(page)).cam.z;
    await page.waitForTimeout(1500);
    expect(Math.abs((await state(page)).cam.z - z1)).toBeLessThan(0.5);
    await ctx.close();
  });
});
