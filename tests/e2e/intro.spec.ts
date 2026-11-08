import { test, expect } from '@playwright/test';
import { collect, state } from './helpers';

test.describe('B · intro', () => {
  test('book opens, fairy appears, camera travels, reveal shows, then the world', async ({ page }) => {
    const c = collect(page);
    await page.goto('/?quality=low&renderScale=0.4');
    const open = page.getByTestId('open-book');
    await expect(open).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('heading', { name: 'Once Upon a Magical Time…' })).toBeVisible();
    const before = await state(page);
    expect(before.phase).toBe('book');
    await open.click();
    // repeated clicks must not restart or break the film
    await open.click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForFunction(() => window.__MAGIC__!.world.intro.book > 0.5, null, { timeout: 30_000 });
    await page.waitForFunction(() => window.__MAGIC__!.world.intro.fairy > 0.05, null, { timeout: 30_000 });
    const mid = await state(page);
    expect(['opening', 'journey', 'reveal']).toContain(mid.phase);
    await expect(page.getByTestId('reveal')).toBeVisible({ timeout: 60_000 });
    const revealText = await page.getByTestId('reveal').textContent();
    for (const line of ['YOU ARE INVITED!', 'ADVIKA IS TURNING 7!', 'LET’S CELEBRATE HER MAGICAL BIRTHDAY!', 'Saturday, November 28, 2026']) expect(revealText).toContain(line);
    const atDoors = await state(page);
    expect(Math.hypot(atDoors.cam.x - before.cam.x, atDoors.cam.y - before.cam.y, atDoors.cam.z - before.cam.z)).toBeGreaterThan(100);
    expect(atDoors.intro.doors).toBeGreaterThan(0.5);
    await page.getByTestId('enter-main').click({ timeout: 3000 }).catch(() => {}); // it also auto-continues
    await expect.poll(async () => (await state(page)).phase).toBe('main');
    await expect(page.getByRole('navigation', { name: 'Invitation sections' })).toBeVisible();
    expect(c.errors).toEqual([]);
  });

  test('skip intro works from the very first moment', async ({ page }) => {
    await page.goto('/?quality=low&renderScale=0.4');
    const skip = page.getByTestId('skip-intro');
    await expect(skip).toBeVisible({ timeout: 90_000 });
    await skip.click();
    await expect.poll(async () => (await state(page)).phase).toBe('main');
    await expect(page.getByTestId('section-home')).toBeVisible();
    // scroll is unlocked after skipping
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  });

  test('skip during the journey lands cleanly in the main world', async ({ page }) => {
    const c = collect(page);
    await page.goto('/?quality=low&renderScale=0.4&introSpeed=0.4');
    await page.getByTestId('open-book').click({ timeout: 90_000 });
    await page.waitForFunction(() => window.__MAGIC__!.world.intro.book > 0.3, null, { timeout: 30_000 });
    expect((await state(page)).phase).not.toBe('main');
    await page.getByTestId('skip-intro').click();
    await expect.poll(async () => (await state(page)).phase).toBe('main');
    const s = await state(page);
    expect(s.intro.doors).toBe(1);
    expect(c.errors).toEqual([]);
  });

  test('sound is off until the visitor turns it on; toggle and volume work', async ({ page }) => {
    await page.goto('/?quality=low&renderScale=0.4');
    const toggle = page.getByTestId('sound-toggle');
    await expect(toggle).toBeVisible({ timeout: 90_000 });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => window.__MAGIC__!.state().soundOn)).toBe(false);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('skip-intro').click();
    await page.getByTestId('volume-button').click();
    const slider = page.getByTestId('volume-slider');
    await slider.fill('0.25');
    expect(await page.evaluate(() => window.__MAGIC__!.state().volume)).toBeCloseTo(0.25);
  });
});
