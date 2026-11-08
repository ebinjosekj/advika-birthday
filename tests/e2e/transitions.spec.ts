import { test, expect } from '@playwright/test';
import { centre, collect, openMain, SECTIONS, state } from './helpers';

test.describe('C · transitions', () => {
  test('each chapter maps to its camera station, forward and in reverse', async ({ page }) => {
    const c = collect(page);
    await openMain(page);
    for (const [i, id] of SECTIONS.entries()) {
      await centre(page, id);
      await expect.poll(async () => Math.round((await state(page)).t * 10) / 10).toBeCloseTo(i, 0);
    }
    for (const [i, id] of [...SECTIONS.entries()].reverse()) {
      await centre(page, id);
      await expect.poll(async () => Math.round((await state(page)).t * 10) / 10).toBeCloseTo(i, 0);
    }
    expect(c.errors).toEqual([]);
  });

  test('camera actually moves and never freezes or produces NaN', async ({ page }) => {
    await openMain(page);
    const a = await state(page);
    await centre(page, 'details');
    await page.waitForFunction((z) => Math.abs(window.__MAGIC__!.world.camera.z - z) > 5, a.cam.z, { timeout: 30_000 });
    const b = await state(page);
    for (const v of [b.cam.x, b.cam.y, b.cam.z]) expect(Number.isFinite(v)).toBe(true);
    const f0 = b.frames;
    await page.waitForFunction((f) => window.__MAGIC__!.world.frames > f + 2, f0, { timeout: 30_000 });
  });

  test('fast scrolling to the end and back keeps state consistent', async ({ page }) => {
    const c = collect(page);
    await openMain(page);
    for (let k = 0; k < 4; k++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(async () => (await state(page)).section).toBe('finale');
    await expect.poll(async () => (await state(page)).t).toBeCloseTo(SECTIONS.length - 1, 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await state(page)).section).toBe('home');
    await expect.poll(async () => (await state(page)).t).toBeCloseTo(0, 1);
    expect(c.errors).toEqual([]);
  });

  test('mouse-wheel and keyboard scrolling advance through chapters', async ({ page }) => {
    await openMain(page);
    for (let k = 0; k < 6; k++) await page.mouse.wheel(0, 400);
    await expect.poll(async () => (await state(page)).section).not.toBe('home');
    await page.evaluate(() => window.scrollTo(0, 0));
    // keyboard scrolling with nothing focused (as after a page load)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  });

  test('touch scrolling works', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    // gesture starts over the 3D world (top of screen), not over a text panel
    const page = await ctx.newPage();
    await openMain(page);
    const cdp = await ctx.newCDPSession(page);
    // a real finger swipe over the 3D world (below the hero sheet) — the canvas must allow vertical panning
    const swipe = async (x: number, y0: number, y1: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 12 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    expect(await page.evaluate(() => document.elementFromPoint(200, 750)?.tagName)).toBe('CANVAS');
    await swipe(200, 750, 150);
    await swipe(200, 750, 150);
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 30_000 }).toBeGreaterThan(500);
    await expect.poll(async () => (await state(page)).t).toBeGreaterThan(0.3);
    await ctx.close();
  });

  test('navigation links travel to each chapter and are interruptible', async ({ page }) => {
    await openMain(page);
    const nav = page.getByRole('navigation', { name: 'Invitation sections' });
    for (const [label, id] of [['RSVP', 'rsvp'], ['Countdown', 'countdown'], ['Party Details', 'details'], ['Location', 'location'], ['Birthday', 'birthday'], ['Home', 'home']]) {
      await nav.getByRole('link', { name: label, exact: true }).click();
      await expect.poll(async () => (await state(page)).section, { timeout: 30_000 }).toBe(id);
    }
    // interrupt a long scroll with a wheel gesture: must not snap back
    await nav.getByRole('link', { name: 'RSVP', exact: true }).click();
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(800);
    const y1 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(800);
    const y2 = await page.evaluate(() => window.scrollY);
    expect(Math.abs(y2 - y1)).toBeLessThan(5);
  });

  test('chapter panels do not overlap each other', async ({ page }) => {
    await openMain(page);
    const boxes = await page.$$eval('.chapter .panel', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; }));
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom);
  });
});
