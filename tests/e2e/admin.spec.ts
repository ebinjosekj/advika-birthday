import { test, expect } from '@playwright/test';
import { collect } from './helpers';

test.describe('I · admin dashboard page', () => {
  test('loads on its own page without the 3D world and without errors', async ({ page }) => {
    const c = collect(page);
    await page.goto('/admin.html');
    await expect(page.getByRole('heading', { name: 'RSVP dashboard' })).toBeVisible();
    await expect(page.getByTestId('world-canvas')).toHaveCount(0);
    expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain('noindex');
    expect(c.errors).toEqual([]);
  });
});
