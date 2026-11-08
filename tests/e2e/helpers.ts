import { expect, type Page } from '@playwright/test';

export interface Collected {
  errors: string[];
  failedRequests: string[];
}

/** Collect console errors, uncaught exceptions and failed/404 requests. */
export function collect(page: Page): Collected {
  const c: Collected = { errors: [], failedRequests: [] };
  page.on('console', (m) => {
    if (m.type() === 'error') c.errors.push(m.text());
  });
  page.on('pageerror', (e) => c.errors.push('Uncaught: ' + e.message));
  page.on('requestfailed', (r) => {
    // the browser aborts in-flight requests on navigation/teardown; ignore those
    if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) c.failedRequests.push(`${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) c.failedRequests.push(`${r.status()} ${r.url()}`);
  });
  return c;
}

export const state = (page: Page) =>
  page.evaluate(() => {
    const m = window.__MAGIC__!;
    const s = m.state();
    return { phase: s.phase, section: s.activeSection, t: m.world.t, cam: { ...m.world.camera }, intro: { ...m.world.intro }, frames: m.world.frames, fps: m.world.fps, secret: s.secretFound, quality: s.quality };
  });

/** Opens the site with the intro skipped and waits for the scroll-driven world. */
export async function openMain(page: Page, extra = '') {
  await page.goto(`/?skipIntro=1&quality=low&renderScale=0.4${extra}`);
  await page.waitForFunction(() => window.__MAGIC__?.state().phase === 'main', null, { timeout: 90_000 });
  await expect(page.getByTestId('section-home')).toBeVisible();
}

/** Scroll so a chapter is centred (the point where its camera station is framed). */
export async function centre(page: Page, id: string) {
  await page.evaluate((id) => {
    const el = document.getElementById(id)!;
    window.scrollTo(0, el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2);
  }, id);
  await page.waitForFunction((id) => window.__MAGIC__!.state().activeSection === id, id, { timeout: 30_000 });
}

export const SECTIONS = ['home', 'birthday', 'countdown', 'details', 'location', 'dress-code', 'rsvp', 'finale'];
