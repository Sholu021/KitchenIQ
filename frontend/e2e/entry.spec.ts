import { test, expect } from '@playwright/test';

test.describe('public entry and demo access UI', () => {
  test('login page renders credential fields and demo entry point', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /sign in to your kitchen/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /explore demo account/i })).toBeVisible();
  });

  test('protected dashboard redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /sign in to your kitchen/i })).toBeVisible();
  });
});
