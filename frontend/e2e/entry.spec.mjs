import { test, expect } from '@playwright/test';

test.describe('public entry and protected dashboard shell', () => {
  test('login page renders credential fields and demo entry point', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /sign in to your kitchen/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /explore demo account/i })).toBeVisible();
  });

  test('dashboard shows its loading shell before auth hydration', async ({ page }) => {
    await page.goto('/dashboard');

    // The auth store hydrates on the client before protected content is shown.
    await expect(page.getByText('Loading...')).toBeVisible();
  });

  test('demo entry authenticates into an isolated workspace and logout returns to login', async ({ page }) => {
    const demoLoginRequests = [];

    // Stub every API call: this browser test must never touch Render or
    // production/demo database records.
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.endsWith('/auth/demo')) {
        demoLoginRequests.push(route.request());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            role: 'Owner',
            organization_id: 987654,
            user_name: 'KitchenIQ Test User',
          }),
        });
        return;
      }

      if (url.pathname.endsWith('/auth/organization')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            name: 'KitchenIQ Isolated Demo',
            subscription_tier: 'Free',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/login');
    await page.getByRole('button', { name: /explore demo account/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('link', { name: 'Inventory & Batches' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByText('KitchenIQ Isolated Demo')).toBeVisible();
    expect(demoLoginRequests).toHaveLength(1);

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: /explore demo account/i })).toBeVisible();
  });
});
