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
  await expect(page.getByRole('cell', { name: '18 g', exact: true })).toBeVisible();

  await page.locator('div.fixed.inset-0').getByRole('button').click();
  await expect(page.getByText('Full Ingredient Breakdown')).toBeHidden();

  page.once('dialog', (dialog) => dialog.accept());
  const recipeHeading = page.getByRole('heading', { name: 'Playwright Test Cappuccino' });
  const recipeCard = recipeHeading.locator('xpath=../../..');
  await recipeCard.getByRole('button').first().click();
  await expect(page.getByText(/No recipes defined/)).toBeVisible();
  expect(deletedId).toBe(801);
});


test('creates and sends a purchase order using isolated synthetic API fixtures', async ({ page }) => {
  const supplier = { id: 1001, name: 'Playwright Test Supplier', email: 'supplier@example.test' };
  const product = {
    id: 1002,
    name: 'Playwright Test Flour',
    sku: 'PW-PO-1002',
    unit: 'kg',
    cost_price: 40,
    is_active: true,
  };
  let purchaseOrders = [];
  let createPayload;
  let statusPayload;

  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();

    if (path.endsWith('/suppliers') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([supplier]) });
      return true;
    }
    if (path.endsWith('/products') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [product], total: 1 }),
      });
      return true;
    }
    if (path.endsWith('/purchase-orders') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(purchaseOrders) });
      return true;
    }
    if (path.endsWith('/purchase-orders') && method === 'POST') {
      createPayload = route.request().postDataJSON();
      purchaseOrders = [{
        id: 1101,
        status: 'DRAFT',
        total_amount: 120,
        created_at: '2026-01-15T10:00:00Z',
        supplier,
        items: [{
          id: 1201,
          product_id: product.id,
          quantity: 3,
          unit_price: 40,
          product,
        }],
      }];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(purchaseOrders[0]) });
      return true;
    }
    if (path.endsWith('/purchase-orders/1101/status') && method === 'PATCH') {
      statusPayload = route.request().postDataJSON();
      purchaseOrders = purchaseOrders.map((po) => ({ ...po, status: statusPayload.status }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(purchaseOrders[0]) });
      return true;
    }
    return false;
  });

  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  await page.getByRole('button', { name: 'Draft PO' }).click();
  const selects = page.locator('select');
  await selects.nth(0).selectOption('1001');
  await selects.nth(1).selectOption('1002');
  await page.getByPlaceholder('Qty').fill('3');
  await page.getByRole('button', { name: 'Create Draft Purchase Order' }).click();

  const poRow = page.getByRole('row').filter({ hasText: 'Playwright Test Supplier' });
  await expect(poRow).toBeVisible();
  await expect(poRow).toContainText('DRAFT');
  expect(createPayload).toMatchObject({
    supplier_id: 1001,
    items: [{
      product_id: 1002,
      quantity: 3,
      unit_price: 40,
      batch_number: null,
      expiry_date: null,
    }],
  });

  await poRow.getByRole('button', { name: /Send Vendor/ }).click();
  await expect(poRow).toContainText('SENT');
  expect(statusPayload).toEqual({ status: 'SENT' });
});


test('receives a sent purchase order using isolated synthetic API fixtures', async ({ page }) => {
  const supplier = { id: 1301, name: 'Playwright Receiving Supplier', email: 'receiving@example.test' };
  const product = {
    id: 1302,
    name: 'Playwright Test Cocoa',
    sku: 'PW-PO-1302',
    unit: 'kg',
    cost_price: 80,
    is_active: true,
  };
  let purchaseOrders = [{
    id: 1303,
    status: 'SENT',
    total_amount: 160,
    created_at: '2026-01-15T10:00:00Z',
    supplier,
    items: [{
      id: 1304,
      product_id: product.id,
      quantity: 2,
      unit_price: 80,
      batch_number: 'PW-BATCH-1304',
      expiry_date: '2027-12-31',
      product,
    }],
  }];
  let receivePayload;

  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();
    if (path.endsWith('/suppliers') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([supplier]) });
      return true;
    }
    if (path.endsWith('/products') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [product], total: 1 }),
      });
      return true;
    }
    if (path.endsWith('/purchase-orders') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(purchaseOrders) });
      return true;
    }
    if (path.endsWith('/purchase-orders/1303/receive') && method === 'POST') {
      receivePayload = route.request().postDataJSON();
      purchaseOrders = purchaseOrders.map((po) => ({ ...po, status: 'RECEIVED' }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Purchase order received successfully' }),
      });
      return true;
    }
    return false;
  });

  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  const poRow = page.getByRole('row').filter({ hasText: 'Playwright Receiving Supplier' });
  await expect(poRow).toContainText('SENT');
  await poRow.getByRole('button', { name: /Receive Stock/ }).click();

  await expect(poRow).toContainText('RECEIVED');
  expect(receivePayload).toEqual({
    items: [{
      purchase_order_item_id: 1304,
      batch_number: 'PW-BATCH-1304',
      expiry_date: '2027-12-31',
      quantity: 2,
      unit_price: 80,
    }],
  });
});


test('tracks stock movements, batch metadata, and expired stock with isolated fixtures', async ({ page }) => {
  const product = {
    id: 1401,
    name: 'Playwright Inventory Cocoa',
    sku: 'PW-INV-1401',
    unit: 'kg',
    reorder_level: 2,
    cost_price: 80,
    selling_price: 120,
    current_stock: 5,
    is_active: true,
    is_finished_product: false,
    category: null,
  };
  let products = [{ ...product }];
  let batches = [{
    id: 1402,
    product_id: product.id,
    batch_number: 'PW-EXPIRED-1402',
    expiry_date: '2020-01-01',
    remaining_quantity: 5,
  }];
  let adjustmentPayload;

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
    if (path.endsWith('/batches') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(batches) });
      return true;
    }
    if (path.endsWith('/batches/adjust') && method === 'POST') {
      adjustmentPayload = route.request().postDataJSON();
      const newBatch = {
        id: 1403,
        product_id: product.id,
        batch_number: adjustmentPayload.batch_number,
        expiry_date: adjustmentPayload.expiry_date,
        remaining_quantity: adjustmentPayload.quantity,
      };
      batches = [...batches, newBatch];
      products = products.map((item) => ({
        ...item,
        current_stock: item.current_stock + adjustmentPayload.quantity,
      }));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Stock movement recorded', batch: newBatch }),
      });
      return true;
    }
    if (path.endsWith('/batches/alerts') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ expired: batches.filter((batch) => batch.expiry_date < '2026-01-01'), expiring_7: [], expiring_30: [] }),
      });
      return true;
    }
    return false;
  });

  await page.getByRole('link', { name: 'Inventory & Batches' }).click();
  const productRow = page.getByRole('row').filter({ hasText: 'Playwright Inventory Cocoa' });
  await expect(productRow).toBeVisible();

  // The only recorded stock is expired, so it must not be treated as usable.
  await expect(productRow).toContainText(/Out of Stock/i);
  await productRow.getByRole('button').last().click();

  await expect(page.getByRole('heading', { name: 'Record Stock Movement' })).toBeVisible();
  await page.getByPlaceholder('e.g. 50').fill('4');
  await page.getByPlaceholder('e.g. BATCH-A').fill('PW-FRESH-1403');
  await page.locator('input[type="date"]').fill('2099-12-31');
  await page.getByPlaceholder('e.g. Spoilage disposal, fresh delivery...').fill('Isolated Playwright stock receipt');
  await page.getByRole('button', { name: 'Save Movement' }).click();

  expect(adjustmentPayload).toEqual({
    product_id: 1401,
    quantity: 4,
    transaction_type: 'STOCK_IN',
    notes: 'Isolated Playwright stock receipt',
    batch_id: null,
    batch_number: 'PW-FRESH-1403',
    expiry_date: '2099-12-31',
  });

  await expect(page.getByRole('heading', { name: 'Record Stock Movement' })).toBeHidden();
  await productRow.getByRole('button').first().click();
  await expect(page.getByText('Available Batches (FEFO Inventory)')).toBeVisible();
  await expect(page.getByText('PW-EXPIRED-1402')).toBeVisible();
  await expect(page.getByText('PW-FRESH-1403')).toBeVisible();
});


test('records an isolated stock-out movement with reason and batch allocation', async ({ page }) => {
  const product = {
    id: 1501,
    name: 'Playwright Stock Out Flour',
    sku: 'PW-OUT-1501',
    unit: 'kg',
    reorder_level: 1,
    cost_price: 40,
    selling_price: 60,
    current_stock: 8,
    is_active: true,
    is_finished_product: false,
    category: null,
  };
  const batch = {
    id: 1502,
    product_id: product.id,
    batch_number: 'PW-OUT-BATCH',
    expiry_date: '2099-12-31',
    remaining_quantity: 8,
  };
  let adjustmentPayload;

  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();
    if (path.endsWith('/products') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [product], total: 1 }),
      });
      return true;
    }
    if (path.endsWith('/batches') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([batch]) });
      return true;
    }
    if (path.endsWith('/batches/alerts') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ expired: [], expiring_7: [], expiring_30: [] }),
      });
      return true;
    }
    if (path.endsWith('/batches/adjust') && method === 'POST') {
      adjustmentPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Stock movement recorded' }),
      });
      return true;
    }
    return false;
  });

  await page.getByRole('link', { name: 'Inventory & Batches' }).click();
  const productRow = page.getByRole('row').filter({ hasText: 'Playwright Stock Out Flour' });
  await expect(productRow).toBeVisible();
  await productRow.getByRole('button').last().click();

  await page.getByRole('button', { name: '- Remove Stock' }).click();
  await page.getByPlaceholder('e.g. 50').fill('3');
  await page.getByPlaceholder('e.g. Spoilage disposal, fresh delivery...').fill('Isolated stock-out test');
  await page.getByRole('button', { name: 'Save Movement' }).click();

  expect(adjustmentPayload).toMatchObject({
    product_id: 1501,
    quantity: 3,
    transaction_type: 'STOCK_OUT',
    notes: 'Isolated stock-out test',
  });
  expect(adjustmentPayload).toHaveProperty('batch_id');
  await expect(page.getByRole('heading', { name: 'Record Stock Movement' })).toBeHidden();
});


test('records an isolated inventory correction with a reason', async ({ page }) => {
  const product = {
    id: 1601,
    name: 'Playwright Correction Sugar',
    sku: 'PW-COR-1601',
    unit: 'kg',
    reorder_level: 1,
    cost_price: 30,
    selling_price: 45,
    current_stock: 6,
    is_active: true,
    is_finished_product: false,
    category: null,
  };
  const batch = {
    id: 1602,
    product_id: product.id,
    batch_number: 'PW-COR-BATCH',
    expiry_date: '2099-12-31',
    remaining_quantity: 6,
  };
  let adjustmentPayload;

  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();
    if (path.endsWith('/products') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [product], total: 1 }),
      });
      return true;
    }
    if (path.endsWith('/batches') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([batch]) });
      return true;
    }
    if (path.endsWith('/batches/alerts') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ expired: [], expiring_7: [], expiring_30: [] }),
      });
      return true;
    }
    if (path.endsWith('/batches/adjust') && method === 'POST') {
      adjustmentPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Stock movement recorded' }),
      });
      return true;
    }
    return false;
  });

  await page.getByRole('link', { name: 'Inventory & Batches' }).click();
  const productRow = page.getByRole('row').filter({ hasText: 'Playwright Correction Sugar' });
  await expect(productRow).toBeVisible();
  await productRow.getByRole('button').last().click();

  await page.getByRole('button', { name: 'Correction' }).click();
  await page.getByPlaceholder('e.g. 50').fill('2');
  await page.getByPlaceholder('e.g. Spoilage disposal, fresh delivery...').fill('Isolated correction test');
  await page.getByRole('button', { name: 'Save Movement' }).click();

  expect(adjustmentPayload).toMatchObject({
    product_id: 1601,
    quantity: 2,
    transaction_type: 'ADJUSTMENT',
    notes: 'Isolated correction test',
  });
  await expect(page.getByRole('heading', { name: 'Record Stock Movement' })).toBeHidden();
});


test('opens and filters an isolated product inventory ledger', async ({ page }) => {
  const product = {
    id: 1701,
    name: 'Playwright Ledger Lentils',
    sku: 'PW-LEDGER-1701',
    unit: 'kg',
    reorder_level: 1,
    cost_price: 50,
    selling_price: 75,
    current_stock: 9,
    is_active: true,
    is_finished_product: false,
    category: null,
  };
  const transactions = [
    {
      id: 1702,
      transaction_type: 'STOCK_IN',
      quantity: 12,
      notes: 'Synthetic opening receipt',
      created_at: '2026-10-20T10:00:00Z',
    },
    {
      id: 1703,
      transaction_type: 'STOCK_OUT',
      quantity: -3,
      notes: 'Synthetic usage',
      created_at: '2026-10-21T10:00:00Z',
    },
  ];

  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();
    if (path.endsWith('/products') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [product], total: 1 }),
      });
      return true;
    }
    if (path.endsWith('/batches') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return true;
    }
    if (path.endsWith('/batches/alerts') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ expired: [], expiring_7: [], expiring_30: [] }),
      });
      return true;
    }
    if (path.endsWith('/batches/products/1701/ledger') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ current_stock: 9, unit: 'kg', transactions }),
      });
      return true;
    }
    return false;
  });

  await page.getByRole('link', { name: 'Inventory & Batches' }).click();
  const productRow = page.getByRole('row').filter({ hasText: 'Playwright Ledger Lentils' });
  await expect(productRow).toBeVisible();
  await productRow.getByTitle('View inventory ledger').click();

  await expect(page.getByText('Inventory Ledger')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Playwright Ledger Lentils' })).toBeVisible();
  await expect(page.getByText('+12', { exact: true })).toBeVisible();
  await expect(page.getByText('-3', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'STOCK OUT (1)' }).click();
  await expect(page.getByText('Synthetic usage')).toBeVisible();
  await expect(page.getByText('Synthetic opening receipt')).toBeHidden();
  await expect(page.getByText('Filtered Net')).toBeVisible();

  await page.getByTitle('Close ledger').click();
  await expect(page.getByText('Inventory Ledger')).toBeHidden();
});


test('records and views a sale using isolated synthetic API fixtures', async ({ page }) => {
  const recipe = { id: 1801, name: 'Playwright Test Latte', cost_price: 42 };
  let sales = [];
  let salePayload;
  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();
    if (path.endsWith('/recipes') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([recipe]) });
      return true;
    }
    if (path.endsWith('/sales') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sales) });
      return true;
    }
    if (path.endsWith('/sales') && method === 'POST') {
      salePayload = route.request().postDataJSON();
      sales = [{ id: 1803, sale_date: '2026-11-02T10:00:00Z', total_amount: 240,
        items: [{ id: 1804, quantity: 2, recipe: { id: 1801, name: recipe.name } }] }];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(sales[0]) });
      return true;
    }
    return false;
  });
  await page.getByRole('link', { name: 'Sales' }).click();
  await expect(page.getByRole('heading', { name: 'Sales Register' })).toBeVisible();
  await page.getByRole('button', { name: 'Record Sale' }).click();
  await page.locator('select').selectOption('1801');
  await page.locator('input[type="number"]').fill('2');
  await page.getByRole('button', { name: 'Submit Sale & Deduct Inventory' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'SALE-1803' })).toContainText('₹240.00');
  expect(salePayload).toEqual({ items: [{ recipe_id: 1801, quantity: 2 }] });
  await page.getByRole('button', { name: 'View Items' }).click();
  await expect(page.getByText('Sale # SALE-1803')).toBeVisible();
  await expect(page.getByText('Playwright Test Latte', { exact: true })).toBeVisible();
  await expect(page.getByText('₹240.00')).toBeVisible();
});

test('rejects an insufficient-stock sale without persisting a sale', async ({ page }) => {
  const recipe = { id: 1901, name: 'Playwright Low Stock Cappuccino', cost_price: 35 };
  let sales = [];
  let attemptedPayload;
  let salePostCount = 0;
  await enterIsolatedDemo(page, async (route, path) => {
    const method = route.request().method();
    if (path.endsWith('/recipes') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([recipe]) });
      return true;
    }
    if (path.endsWith('/sales') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sales) });
      return true;
    }
    if (path.endsWith('/sales') && method === 'POST') {
      salePostCount += 1;
      attemptedPayload = route.request().postDataJSON();
      await route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ detail: 'Insufficient inventory for Playwright Test Milk. Required 20, Available 5' }) });
      return true;
    }
    return false;
  });
  await page.getByRole('link', { name: 'Sales' }).click();
  await page.getByRole('button', { name: 'Record Sale' }).click();
  await page.locator('select').selectOption('1901');
  await page.locator('input[type="number"]').fill('2');
  await page.getByRole('button', { name: 'Submit Sale & Deduct Inventory' }).click();
  await expect(page.getByText(/Insufficient inventory for Playwright Test Milk/)).toBeVisible();
  expect(attemptedPayload).toEqual({ items: [{ recipe_id: 1901, quantity: 2 }] });
  expect(salePostCount).toBe(1);
  expect(sales).toHaveLength(0);
  await expect(page.getByText('No sales recorded yet.', { exact: false })).toBeVisible();
});
