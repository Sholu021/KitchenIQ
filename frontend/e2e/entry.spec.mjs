import { test, expect } from '@playwright/test';

test.describe('public entry and protected dashboard shell', () => {
  test('login page renders credential fields and demo entry point', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /sign in to your kitchen/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /explore demo account/i })).toBeVisible();
  });

  test('dashboard does not render protected content before auth hydration', async ({ page }) => {
    await page.goto('/dashboard');

    // The persisted auth store hydrates on the client. Until then, the
    // dashboard layout intentionally renders only its loading state.
    await expect(page.getByText('Loading...')).toBeVisible();
  });
});
