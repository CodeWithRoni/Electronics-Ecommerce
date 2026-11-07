// The shop website against Karvio's in-memory backend: browse, search, product page with pictures,
// cart, checkout with cash on delivery and bKash, order tracking, closed shop and phone layout.
import { test, expect } from '@playwright/test';

const API = 'http://localhost:8787';
let token, ids = {};
async function call(request, action, payload = {}, tk = token) {
  const r = await request.post(API, { data: { action, payload, token: tk } });
  const b = await r.json();
  expect(b.ok, `${action}: ${b.error}`).toBe(true);
  return b.data;
}
async function jpeg(browser, color) {
  const p = await browser.newPage({ viewport: { width: 300, height: 300 } });
  await p.setContent(`<div style="width:300px;height:300px;background:${color}"></div>`);
  const buf = await p.screenshot({ type: 'jpeg', quality: 80 });
  await p.close();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

test.beforeAll(async ({ request, browser }) => {
  token = (await call(request, 'login', { username: 'admin', password: 'admin123' }, null)).token;
  await call(request, 'shop.setup');
  await call(request, 'settings.save', { values: { shop_name: 'COMPUTER PLUS', shop_phone: '01754614614', shop_address: 'Bera, Pabna', shop_enabled: 'true', shop_bkash_number: '01754614614', shop_bkash_type: 'personal', shop_delivery_inside: '60', shop_delivery_outside: '130', shop_inside_label: 'Inside Pabna', shop_notice: 'Eid offer: free gift with every order' } });
  const boot = await call(request, 'bootstrap');
  const grp = boot.categories.find((c) => !c.parent_id), sub = boot.categories.find((c) => c.parent_id === grp.id);
  const brand = await call(request, 'master.save', { kind: 'brand', name: 'A4Tech' });
  const sup = await call(request, 'supplier.save', { name: 'Shop supplier' });
  const mk = (x) => call(request, 'product.save', x);
  ids.mouse = (await mk({ name: 'MOUSE WIRED OP-620D', sku: 'OP-620D', category_id: grp.id, subcategory_id: sub?.id || '', brand_id: brand.id, web: true, has_warranty: true, warranty_type: 'invoice', warranty_days: 365, description: 'Wired optical mouse, 1000 DPI.' })).id;
  ids.cable = (await mk({ name: 'CAT6 CABLE', unit: 'meter', web: true })).id;
  ids.router = (await mk({ name: 'ROUTER DUAL BAND C54', web: true })).id;
  ids.secret = (await mk({ name: 'NOT ONLINE ITEM', web: false })).id;
  await call(request, 'purchase.create', { supplier_id: sup.id, items: [
    { product_id: ids.mouse, qty: 8, cost: 380, sale_price: 550 }, { product_id: ids.cable, qty: 100, cost: 20, sale_price: 35 }, { product_id: ids.secret, qty: 3, cost: 900, sale_price: 1500 }],
    payments: [{ account_id: boot.accounts[0].id, amount: 7740 }] });
  await call(request, 'price.update', { items: [{ id: ids.router, sale_price: 2200, wholesale_price: 2000 }] });
  await call(request, 'product.image.add', { id: ids.mouse, data: await jpeg(browser, '#f2c230') });
  await call(request, 'product.image.add', { id: ids.mouse, data: await jpeg(browser, '#3cc4d6') });
});

test('home, search, filters and product page', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.brand b')).toHaveText('COMPUTER PLUS');
  await expect(page.locator('.notice')).toHaveText('Eid offer: free gift with every order');
  await expect(page).toHaveTitle('COMPUTER PLUS — Online Shop');
  const cards = page.locator('.pcard');
  await expect(cards.filter({ hasText: 'MOUSE WIRED OP-620D' })).toBeVisible();
  await expect(page.getByText('NOT ONLINE ITEM')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('380'); // never the cost
  // search
  await page.getByRole('searchbox', { name: 'Search products' }).fill('a4tech');
  await page.getByRole('searchbox', { name: 'Search products' }).press('Enter');
  await expect(page.locator('.page-title h1')).toHaveText('Results for “a4tech”');
  await expect(page.locator('.pcard')).toHaveCount(1);
  // all products, in-stock filter, sort
  await page.goto('/#/products');
  await expect(page.locator('.pcard')).toHaveCount(3);
  await expect(page.locator('.pcard').filter({ hasText: 'ROUTER' }).locator('.badge')).toHaveText('Out of stock');
  await expect(page.locator('.pcard').filter({ hasText: 'ROUTER' }).getByRole('button', { name: /Add/ })).toBeDisabled();
  await page.getByLabel('In stock only').check();
  await expect(page.locator('.pcard')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Sort' }).selectOption('high');
  await expect(page.locator('.pcard .pcard-name').first()).toHaveText('MOUSE WIRED OP-620D');
  // product page with pictures
  await page.locator('.pcard').filter({ hasText: 'MOUSE' }).getByRole('link').click();
  await expect(page.locator('.pdp-info h1')).toHaveText('MOUSE WIRED OP-620D');
  await expect(page.locator('.pdp-info .price')).toHaveText('Tk 550');
  await expect(page.locator('.facts')).toContainText('1 year warranty');
  await expect(page.locator('.facts')).toContainText('Model: OP-620D');
  const main = page.locator('.gallery > .photo img');
  await expect(main).toHaveJSProperty('complete', true);
  expect(await main.evaluate((i) => i.naturalWidth)).toBeGreaterThan(100); // the Drive picture really loads
  await expect(page.locator('.thumbs button')).toHaveCount(2);
  const first = await main.getAttribute('src');
  await page.locator('.thumbs button').nth(1).click();
  expect(await main.getAttribute('src')).not.toBe(first);
  expect(errors).toEqual([]);
});

test('cart and cash-on-delivery order, then tracking', async ({ page, request }) => {
  await page.goto(`/#/p/${ids.mouse}`);
  await page.getByRole('button', { name: 'More Quantity' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.locator('.toast')).toContainText('added to cart');
  await expect(page.locator('.cart-count')).toHaveText('2');
  await page.goto(`/#/p/${ids.cable}`);
  await page.getByRole('spinbutton', { name: /Quantity/ }).fill('12.5');
  await page.getByRole('button', { name: 'Buy now' }).click();
  await expect(page.locator('.page-title h1')).toHaveText('Cart');
  await expect(page.locator('.summary')).toContainText('Tk 1,537.5'); // 2 × 550 + 12.5 × 35
  await page.getByRole('button', { name: 'Checkout' }).click();
  // validation
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.getByText('Please write your name')).toBeVisible();
  await expect(page.getByText('Write a valid mobile number, e.g. 017XXXXXXXX')).toBeVisible();
  await page.getByLabel('Your name').fill('Rahim Uddin');
  await page.getByLabel('Mobile number').fill('01711-000000');
  await page.getByLabel('Full address').fill('House 5, Road 2, Bera, Pabna');
  await page.getByText('Everywhere else').click();
  await expect(page.locator('.summary .total')).toContainText('Tk 1,667.5');
  await page.getByText('Inside Pabna').click();
  await expect(page.locator('.summary .total')).toContainText('Tk 1,597.5');
  await page.getByRole('button', { name: 'Place order — Tk 1,597.5' }).click();
  await expect(page.locator('.okbox h1')).toHaveText('Thank you! Your order is placed.');
  const no = (await page.locator('.order-no').textContent()).trim();
  expect(no).toMatch(/^WO-\d{6}$/);
  await expect(page.locator('.cart-count')).toHaveCount(0);
  const list = await call(request, 'weborders.list');
  const saved = list.orders.find((o) => o.order_no === no);
  expect([saved.total, saved.payment, saved.phone, saved.items.length]).toEqual([1597.5, 'cod', '01711000000', 2]);
  // tracking from the confirmation page
  await page.getByRole('link', { name: 'Track this order' }).click();
  await expect(page.locator('.timeline li.done')).toHaveCount(1);
  await expect(page.locator('.timeline li').first()).toContainText('Order received');
  // the shop confirms it (sale linked) → the customer sees it
  const cust = await call(request, 'customer.quickAdd', { name: 'Rahim Uddin', phone: '01711000000' });
  const sale = await call(request, 'sale.create', { customer_id: cust.id, items: saved.items.map((i) => ({ product_id: i.product_id, qty: i.qty, price: i.price })), payments: [] });
  await call(request, 'weborder.link', { id: saved.id, sale_id: sale.sale.id });
  await page.getByRole('button', { name: 'Find my order' }).click();
  await expect(page.locator('.timeline li.done')).toHaveCount(2);
  await expect(page.locator('.card').filter({ hasText: 'Invoice' })).toContainText(sale.sale.invoice_no);
  // the details are remembered for next time
  await page.goto(`/#/p/${ids.cable}`);
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/#/checkout');
  await expect(page.getByLabel('Your name')).toHaveValue('Rahim Uddin');
});

test('bKash order with Transaction ID', async ({ page, request }) => {
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(`/#/p/${ids.mouse}`);
  await page.evaluate(() => localStorage.removeItem('karvio_shop_customer'));
  await page.getByRole('button', { name: 'Buy now' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Your name').fill('Karim');
  await page.getByLabel('Mobile number').fill('01811000000');
  await page.getByLabel('Full address').fill('Shahzadpur, Sirajganj');
  await page.getByText('bKash', { exact: true }).click();
  const box = page.locator('.bkash-box');
  await expect(box).toContainText('Send Money');
  await expect(box.locator('.bkash-no')).toHaveText('01754614614');
  await expect(box).toContainText('Tk 610');
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.getByText('The TrxID from the bKash message, e.g. 9AB3CD4EF5')).toBeVisible();
  await page.getByLabel('Your bKash number').fill('01811000000');
  await page.getByLabel('Transaction ID (TrxID)').fill('9ab3cd4ef5');
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.locator('.okbox')).toContainText('We will check your bKash payment');
  const no = (await page.locator('.order-no').textContent()).trim();
  const o = (await call(request, 'weborders.list')).orders.find((x) => x.order_no === no);
  expect([o.payment, o.payment_status, o.bkash_trx, o.total]).toEqual(['bkash', 'unverified', '9AB3CD4EF5', 610]);
});

test('phone layout and closed shop', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/#/products', `/#/p/${ids.mouse}`, '/#/track']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
  }
  await call(request, 'settings.save', { values: { shop_enabled: 'false' } });
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('karvio_shop_catalog'));
  await page.reload();
  await expect(page.locator('.closed')).toContainText('Online orders are closed right now');
  await call(request, 'settings.save', { values: { shop_enabled: 'true' } });
});
