import { test, expect } from '@playwright/test';

async function enterIsolatedDemo(page, routeHandler) {
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
    if (routeHandler && await routeHandler(route, path)) return;
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
  await expect(page).toHaveURL(/\\/dashboard$/);
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

  test('creates a product through the multi-step form using synthetic API fixtures', async ({ page }) => {
    let products = [];
    let createPayload;

    await enterIsolatedDemo(page, async (route, path) => {
      if (path.endsWith('/products') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: products, total: products.length }),
        });
        return true;
      }
      if (path.endsWith('/products') && route.request().method() === 'POST') {
        createPayload = route.request().postDataJSON();
        products = [{
          id: 501,
          ...createPayload,
          current_stock: 0,
          is_active: true,
          category: null,
        }];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(products[0]) });
        return true;
      }
      return false;
    });

    await page.getByRole('link', { name: 'Menu Items' }).click();
    await page.getByRole('button', { name: /Add Product/ }).click();
    await page.getByPlaceholder('e.g. Arabica Beans').fill('Playwright Test Beans');
    await page.getByPlaceholder('e.g. COF-ARA-1KG').fill('PW-TEST-501');
    await page.getByPlaceholder('e.g. g, ml, pcs, kg').fill('g');
    await page.getByRole('button', { name: /Continue/ }).click();

    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('12');
    await numberInputs.nth(1).fill('20');
    await numberInputs.nth(2).fill('5');
    await page.getByRole('button', { name: /Review/ }).click();
    await expect(page.getByText('Playwright Test Beans', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save Product' }).click();

    await expect(page.getByText('Playwright Test Beans', { exact: true })).toBeVisible();
    expect(createPayload).toMatchObject({
      name: 'Playwright Test Beans',
      sku: 'PW-TEST-501',
      unit: 'g',
      cost_price: 12,
      selling_price: 20,
      reorder_level: 5,
    });
  });
});
