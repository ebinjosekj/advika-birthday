import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { collect, SECTIONS, centre } from './helpers';

test.describe('G · performance & fallback', () => {
  test('initial load, asset sizes, frame rate and memory stability', async ({ page }) => {
    test.setTimeout(720_000);
    const sizes: { url: string; bytes: number }[] = [];
    page.on('response', async (r) => {
      try {
        const b = await r.body();
        sizes.push({ url: r.url().replace(/^https?:\/\/[^/]+/, ''), bytes: b.length });
      } catch {
        /* redirects etc. */
      }
    });
    const t0 = Date.now();
    await page.goto('/?quality=low&renderScale=0.5');
    await expect(page.getByTestId('open-book')).toBeVisible({ timeout: 90_000 });
    const readyMs = Date.now() - t0;
    const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming; return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd }; });
    await page.getByTestId('skip-intro').click();
    await page.waitForFunction(() => window.__MAGIC__?.state().phase === 'main');
    await page.waitForTimeout(3000);
    const fps = await page.evaluate(() => window.__MAGIC__!.world.fps);
    const heap = () => page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
    const info = () => page.evaluate(() => window.__MAGIC__!.renderInfo?.());
    // warm-up trip: three.js uploads each mesh the first time it comes into view
    for (const id of SECTIONS) await centre(page, id);
    await centre(page, 'home');
    await page.waitForTimeout(1500);
    const info0 = await info();
    const h0 = await heap();
    for (const id of SECTIONS) await centre(page, id);
    await centre(page, 'home');
    await page.evaluate(() => (window as unknown as { gc?: () => void }).gc?.());
    await page.waitForTimeout(1500);
    const h1 = await heap();
    const info1 = await info();
    const big = sizes.filter((s) => s.bytes > 150_000).sort((a, b) => b.bytes - a.bytes);
    const total = sizes.reduce((a, s) => a + s.bytes, 0);
    const report = { readyMs, nav, fpsSoftwareRenderer: fps, heapStartMB: +(h0 / 1e6).toFixed(1), heapAfterRoundTripMB: +(h1 / 1e6).toFixed(1), gpuStart: info0, gpuAfter: info1, totalBytesDev: total, largest: big.slice(0, 8) };
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/performance.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    // geometry/texture counts must stay flat while travelling (no leaks)
    expect(info1!.geometries - info0!.geometries).toBeLessThanOrEqual(2);
    expect(info1!.textures - info0!.textures).toBeLessThanOrEqual(2);
    expect(h1 - h0).toBeLessThan(40e6);
  });

  test('no-WebGL fallback still delivers the whole invitation', async ({ page }) => {
    const c = collect(page);
    await page.goto('/?nowebgl=1');
    await expect(page.getByTestId('static-world')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('world-canvas')).toHaveCount(0);
    await page.getByTestId('open-book').click();
    await expect(page.getByTestId('reveal')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('enter-main').click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await centre(page, 'rsvp');
    await expect(page.getByTestId('rsvp-form')).toBeVisible();
    expect(c.errors).toEqual([]);
  });

  test('mobile profile defaults to the low-quality renderer', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
    const page = await ctx.newPage();
    await page.goto('/?skipIntro=1');
    await page.waitForFunction(() => window.__MAGIC__?.state().phase === 'main', null, { timeout: 90_000 });
    expect(await page.evaluate(() => window.__MAGIC__!.state().quality)).toBe('low');
    await ctx.close();
  });
});
