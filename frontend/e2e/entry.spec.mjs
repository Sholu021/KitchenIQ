import { test, expect } from '@playwright/test';

async function enterIsolatedDemo(page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/auth/me')) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Not authenticated' }) });
      return;
    }
    if (path.endsWith('/auth/demo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: 'Owner', organization_id: 987654, user_name: 'KitchenIQ Test User' }),
      });
      return;
    }
    if (path.endsWith('/auth/organization')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'KitchenIQ Isolated Demo', subscription_tier: 'Free' }),
      });
      return;
    }
    if (path.endsWith('/products')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
      return;
    }
    if (path.endsWith('/batches/value') || path.endsWith('/analytics/inventory-health') || path.endsWith('/dashboard/ai-insights')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      return;
    }

    // All remaining API calls receive empty synthetic collections.
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.goto('/login');
  await page.getByRole('button', { name: /explore demo account/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

test.describe('core workspace pages with isolated API fixtures', () => {
  test('products, recipes, inventory, and purchase orders render without production API access', async ({ page }) => {
    await enterIsolatedDemo(page);

    const pages = [
      { link: 'Menu Items', heading: /Products Registry/ },
      { link: 'Recipes', heading: /Recipe Book & Margins/ },
      { link: 'Inventory & Batches', heading: /Inventory/ },
      { link: 'Purchase Orders', heading: /Purchase Orders/ },
    ];

    // Use the authenticated SPA navigation. Full page reloads intentionally
    // clear the in-memory test auth state because this fixture has no real cookie.
    for (const item of pages) {
      await page.getByRole('link', { name: item.link }).click();
      await expect(page.getByRole('heading', { name: item.heading }).first()).toBeVisible();
    }
  });
});
