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
  await expect(page).toHaveURL(/dashboard$/);
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


  test('edits and deletes a product using isolated synthetic API fixtures', async ({ page }) => {
    let products = [{
      id: 601,
      name: 'Editable Test Beans',
      sku: 'PW-EDIT-601',
      unit: 'g',
      reorder_level: 5,
      cost_price: 10,
      selling_price: 18,
      current_stock: 0,
      is_active: true,
      category_id: null,
      category: null,
    }];
    let updatePayload;
    let deletedId;

    await enterIsolatedDemo(page, async (route, path) => {
      const method = route.request().method();
      if (path.endsWith('/products') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: products, total: products.length }),
        });
        return true;
      }
      if (path.endsWith('/products/601') && method === 'PATCH') {
        updatePayload = route.request().postDataJSON();
        products = products.map((product) => ({ ...product, ...updatePayload }));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(products[0]) });
        return true;
      }
      if (path.endsWith('/products/601') && method === 'DELETE') {
        deletedId = 601;
        products = [];
        await route.fulfill({ status: 204, body: '' });
        return true;
      }
      return false;
    });

    await page.getByRole('link', { name: 'Menu Items' }).click();
    const row = page.getByRole('row').filter({ hasText: 'Editable Test Beans' });
    await expect(row).toBeVisible();
    await row.getByRole('button').nth(1).click();

    await page.getByPlaceholder('e.g. Arabica Beans').fill('Edited Test Beans');
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.locator('input[type="number"]').nth(0).fill('11');
    await page.locator('input[type="number"]').nth(1).fill('21');
    await page.locator('input[type="number"]').nth(2).fill('6');
    await page.getByRole('button', { name: /Review/ }).click();
    await page.getByRole('button', { name: 'Save Product' }).click();

    await expect(page.getByText('Edited Test Beans', { exact: true })).toBeVisible();
    expect(updatePayload).toMatchObject({
      name: 'Edited Test Beans',
      sku: 'PW-EDIT-601',
      unit: 'g',
      cost_price: 11,
      selling_price: 21,
      reorder_level: 6,
    });

    page.once('dialog', (dialog) => dialog.accept());
    const editedRow = page.getByRole('row').filter({ hasText: 'Edited Test Beans' });
    await editedRow.getByRole('button').nth(2).click();
    await expect(page.getByText('No products found in database.', { exact: false })).toBeVisible();
    expect(deletedId).toBe(601);
  });


test('creates, views, and deletes a recipe using isolated synthetic API fixtures', async ({ page }) => {
  const products = [{
    id: 701,
    name: 'Playwright Test Beans',
    sku: 'PW-RECIPE-701',
    unit: 'g',
    is_active: true,
    current_stock: 0,
  }];
  let recipes = [];
  let createPayload;
  let deletedId;

  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();
    if (path.endsWith('/products') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: products, total: products.length }),
      });
      return true;
    }
    if (path.endsWith('/recipes') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(recipes),
      });
      return true;
    }
    if (path.endsWith('/recipes') && method === 'POST') {
      createPayload = route.request().postDataJSON();
      recipes = [{
        id: 801,
        ...createPayload,
        cost_price: 4.5,
        ingredients: [{
          id: 901,
          product_id: 701,
          quantity_required: createPayload.ingredients[0].quantity_required,
          product: products[0],
        }],
      }];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(recipes[0]),
      });
      return true;
    }
    if (path.endsWith('/recipes/801') && method === 'DELETE') {
      deletedId = 801;
      recipes = [];
      await route.fulfill({ status: 204, body: '' });
      return true;
    }
    return false;
  });

  await page.getByRole('link', { name: 'Recipes' }).click();
  await page.getByRole('button', { name: /Add Recipe/ }).click();
  await page.getByPlaceholder('e.g. Cappuccino').fill('Playwright Test Cappuccino');
  await page.getByPlaceholder('Describe recipe preparation or notes...').fill('Isolated browser test recipe');
  const recipeNumbers = page.locator('input[type="number"]');
  await recipeNumbers.nth(0).fill('1');
  await recipeNumbers.nth(1).fill('150');
  await page.locator('select').selectOption('701');
  await page.getByPlaceholder('Qty').fill('18');
  await page.getByRole('button', { name: 'Define Recipe' }).click();

  await expect(page.getByText('Playwright Test Cappuccino', { exact: true })).toBeVisible();
  expect(createPayload).toMatchObject({
    name: 'Playwright Test Cappuccino',
    description: 'Isolated browser test recipe',
    yield_quantity: 1,
    yield_unit: 'portion',
    selling_price: 150,
    ingredients: [{ product_id: 701, quantity_required: 18 }],
  });

  await page.getByRole('button', { name: /View Full Recipe/ }).click();
  await expect(page.getByText('Playwright Test Beans', { exact: true })).toBeVisible();
  await expect(page.getByText('18 g', { exact: true })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  const recipeHeading = page.getByRole('heading', { name: 'Playwright Test Cappuccino' });
  const recipeCard = recipeHeading.locator('xpath=../../..');
  await recipeCard.getByRole('button').first().click();
  await expect(page.getByText(/No recipes defined/)).toBeVisible();
  expect(deletedId).toBe(801);
});
