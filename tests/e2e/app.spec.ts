import { test, expect } from '@playwright/test';
import { collect, openMain, SECTIONS } from './helpers';

test.describe('A · application', () => {
  test('loads with a WebGL world, every section, and no errors or missing assets', async ({ page }) => {
    const c = collect(page);
    await page.goto('/?quality=low&renderScale=0.4');
    await expect(page.getByTestId('loading-progress').or(page.getByTestId('intro'))).toBeVisible();
    await expect(page.getByTestId('open-book')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('world-canvas')).toBeAttached();
    for (const id of SECTIONS) await expect(page.locator(`#${id}`)).toBeAttached();
    // let several frames render so shader compile errors would surface
    await page.waitForFunction(() => window.__MAGIC__!.world.frames > 5, null, { timeout: 60_000 });
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    expect(broken).toEqual([]);
    expect(c.failedRequests).toEqual([]);
    expect(c.errors).toEqual([]);
  });

  test('main experience renders all chapters and key invitation details', async ({ page }) => {
    const c = collect(page);
    await openMain(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Advika’s Magical Fairy Birthday' })).toBeVisible();
    await expect(page.getByTestId('hero-when')).toContainText('Saturday, November 28, 2026');
    await expect(page.getByTestId('hero-when')).toContainText('6:00 PM');
    for (const name of ['Advika is turning 7!', 'Party details', 'The magical location', 'Come Dressed in Pastel Magic!', 'Will You Join Our Magical Celebration?', 'Send Advika a Birthday Wish', 'WE CAN’T WAIT TO CELEBRATE WITH YOU!'])
      await expect(page.getByRole('heading', { name })).toBeAttached();
    await expect(page.getByTestId('address')).toContainText('239 Eden Oak Trail');
    await expect(page.getByTestId('address')).toContainText('1st Floor, Community Lounge');
    expect(c.errors).toEqual([]);
  });
});
