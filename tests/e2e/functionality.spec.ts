import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { centre, collect, openMain } from './helpers';

test.describe('D · functionality', () => {
  test('countdown is correct for a fixed clock', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-25T14:30:15-05:00'));
    await openMain(page);
    const cd = page.getByTestId('countdown');
    // 2026-11-28 18:00 − 2026-11-25 14:30:15 = 3d 3h 29m 45s
    await expect(cd.locator('[data-unit=days]')).toHaveAttribute('data-value', '3');
    await expect(cd.locator('[data-unit=hours]')).toHaveAttribute('data-value', '3');
    await expect(cd.locator('[data-unit=minutes]')).toHaveAttribute('data-value', '29');
    await expect(cd.locator('[data-unit=seconds]')).toHaveAttribute('data-value', '45');
  });

  test('countdown shows the celebration message at zero', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-28T18:00:01-05:00'));
    await openMain(page);
    await expect(page.getByRole('heading', { name: 'THE MAGIC HAS BEGUN!' })).toBeAttached();
    await expect(page.getByTestId('countdown')).toHaveCount(0);
  });

  test('countdown explains the time in the visitor’s own timezone', async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
    const page = await ctx.newPage();
    await openMain(page);
    await expect(page.getByTestId('local-time')).toContainText('Sunday, November 29');
    await expect(page.getByTestId('local-time')).toContainText('4:30');
    await ctx.close();
  });

  test('RSVP validates, shows loading, and succeeds (attending)', async ({ page }) => {
    await openMain(page);
    await centre(page, 'rsvp');
    const form = page.getByTestId('rsvp-form');
    await form.getByTestId('rsvp-submit').click();
    await expect(form.getByText('Please enter your name.')).toBeVisible();
    await expect(form.getByText('Please choose whether you can attend.')).toBeVisible();
    await form.getByLabel('Your name').fill('Priya Nair');
    await form.getByLabel(/Yes, I’ll be there/).check();
    await form.getByRole('button', { name: 'One more guest' }).click();
    await form.getByLabel('A birthday message for Advika (optional)').fill('Happy birthday, little fairy!');
    // record the loading state even if the (900 ms) demo save finishes before we can poll
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid=rsvp-submit]')!;
      const w = window as unknown as { __loading?: boolean };
      new MutationObserver(() => {
        if (btn.textContent?.includes('Sending your reply') && (btn as HTMLButtonElement).disabled) w.__loading = true;
      }).observe(btn, { childList: true, subtree: true, characterData: true, attributes: true });
    });
    await form.getByTestId('rsvp-submit').click();
    await expect(page.getByTestId('rsvp-success')).toContainText('Yay! Your magical adventure awaits!');
    await expect(page.getByTestId('rsvp-success')).toContainText('local demo');
    expect(await page.evaluate(() => (window as unknown as { __loading?: boolean }).__loading)).toBe(true);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('advika.demo.rsvps.v1') ?? '[]'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'Priya Nair', attending: true, attendees: 2, demo: true });
  });

  test('RSVP “not attending” message and double-submit protection', async ({ page }) => {
    await openMain(page);
    await centre(page, 'rsvp');
    const form = page.getByTestId('rsvp-form');
    await form.getByLabel('Your name').fill('Sam');
    await form.getByLabel(/can’t make it/).check();
    await form.getByTestId('rsvp-submit').dblclick();
    await expect(page.getByTestId('rsvp-success')).toContainText('We’ll miss you! Sending magical wishes your way.');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('advika.demo.rsvps.v1') ?? '[]'));
    expect(stored).toHaveLength(1);
  });

  test('RSVP failure is handled and can be retried', async ({ page }) => {
    await openMain(page, '&demoFail=1');
    await centre(page, 'rsvp');
    const form = page.getByTestId('rsvp-form');
    await form.getByLabel('Your name').fill('Lee');
    await form.getByLabel(/Yes, I’ll be there/).check();
    await form.getByTestId('rsvp-submit').click();
    await expect(page.getByTestId('rsvp-error')).toBeVisible();
    await expect(form.getByTestId('rsvp-submit')).toHaveText(/Try again/);
    await expect(form.getByLabel('Your name')).toHaveValue('Lee');
  });

  test('phone, WhatsApp and SMS links are correct', async ({ page }) => {
    await openMain(page);
    const tel = page.getByTestId('tel-link');
    await expect(tel.nth(0)).toHaveAttribute('href', 'tel:+15483332347');
    await expect(tel.nth(1)).toHaveAttribute('href', 'tel:+15483332348');
    const wa = page.getByTestId('whatsapp-link');
    await expect(wa.nth(0)).toHaveAttribute('href', /^https:\/\/wa\.me\/15483332347\?text=/);
    await expect(wa.nth(1)).toHaveAttribute('href', /^https:\/\/wa\.me\/15483332348\?text=/);
    await expect(wa.nth(0)).toHaveAttribute('target', '_blank');
    await expect(page.getByTestId('sms-link').nth(0)).toHaveAttribute('href', /^sms:\+15483332347/);
  });

  test('Google Maps opens the correct destination in a new tab', async ({ page }) => {
    await openMain(page);
    const link = page.getByTestId('maps-link');
    await expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=239%20Eden%20Oak%20Trail%20Kitchener%20Ontario');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('copy address puts the full address on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openMain(page);
    await centre(page, 'location');
    await page.getByTestId('copy-address').click();
    await expect(page.getByTestId('toast')).toContainText('Address copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Evoke Apartments, 239 Eden Oak Trail, 1st Floor, Community Lounge, Kitchener, Ontario');
  });

  test('calendar button downloads a valid .ics', async ({ page }) => {
    await openMain(page);
    await centre(page, 'location');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('add-calendar').click()]);
    expect(dl.suggestedFilename()).toBe('Advika-7th-Fairy-Birthday.ics');
    const text = readFileSync((await dl.path())!, 'utf8');
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('DTSTART:20261128T230000Z');
    expect(text).toContain('END:VCALENDAR');
  });

  test('date detail card also downloads the calendar file', async ({ page }) => {
    await openMain(page);
    await centre(page, 'details');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('detail-date').click()]);
    expect(dl.suggestedFilename()).toMatch(/\.ics$/);
  });

  test('hidden surprises: cake, mushroom, star and the seven-tap butterfly', async ({ page }) => {
    const c = collect(page);
    await openMain(page);
    // record every toast as it appears: on a very slow renderer one can vanish (5.5 s) before we look
    await page.evaluate(() => {
      const w = window as unknown as { __toasts: string[] };
      w.__toasts = [];
      new MutationObserver(() => document.querySelectorAll('[data-testid=toast]').forEach((t) => w.__toasts.push(t.textContent ?? ''))).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    const saw = (text: string) => expect.poll(async () => (await page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts)).some((t) => t.includes(text)), { timeout: 30_000 }).toBe(true);

    await centre(page, 'birthday');
    expect(await page.evaluate(() => window.__MAGIC__!.state().celebrateAt)).toBeLessThan(0); // candles start unlit
    await page.getByTestId('light-candles').click();
    await saw('Make a wish!');
    expect(await page.evaluate(() => window.__MAGIC__!.state().celebrateAt)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Light the birthday cake candles' }).click({ force: true });

    await centre(page, 'details');
    await page.getByRole('button', { name: 'Tap the glowing mushroom' }).click({ force: true });
    await saw('Mushroom magic');

    await centre(page, 'countdown');
    await page.getByRole('button', { name: 'A hidden star' }).click({ force: true });
    await saw('A secret star!');

    const clicks = () => page.evaluate(() => window.__MAGIC__!.state().butterflyClicks);
    const fly = page.getByRole('button', { name: 'The guide butterfly' });
    // it floats with the camera, so click without waiting for it to stand still
    for (let i = 0; i < 12 && (await clicks()) < 7; i++) await fly.click({ force: true });
    expect(await clicks()).toBe(7);
    await saw('Happy 7th birthday, Advika!');
    await saw('You discovered Advika’s secret magic!');
    expect(await page.evaluate(() => window.__MAGIC__!.state().secretFound)).toBe(true);
    expect(c.errors).toEqual([]);
  });

  test('quick-details chip always offers date, time, place and RSVP', async ({ page }) => {
    await openMain(page);
    await centre(page, 'finale');
    await page.getByTestId('quick-details').click();
    const dlg = page.getByRole('dialog', { name: 'Invitation essentials' });
    await expect(dlg).toContainText('Saturday, November 28, 2026');
    await expect(dlg).toContainText('6:00 PM');
    await expect(dlg).toContainText('239 Eden Oak Trail');
    await dlg.getByRole('link', { name: /RSVP/ }).click();
    await expect.poll(() => page.evaluate(() => window.__MAGIC__!.state().activeSection), { timeout: 30_000 }).toBe('rsvp');
  });
});
