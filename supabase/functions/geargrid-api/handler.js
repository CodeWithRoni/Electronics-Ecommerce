const phoneNorm = (value) => String(value || '').replace(/\D/g, '').replace(/^880/, '0');

export function createHandler(env, db, auth) {
  const allowed = env.ALLOWED_ORIGIN || 'https://codewithroni.github.io';
  const shop = {
    name: env.SHOP_NAME || 'GearGrid', open: true, currency: 'BDT',
    address: env.SHOP_ADDRESS || '', phone: env.SHOP_PHONE || '', email: env.SHOP_EMAIL || '',
    notice: '', cod: true, bkash: { enabled: Boolean(env.BKASH_NUMBER), number: env.BKASH_NUMBER || '', type: 'personal' },
    delivery: { inside: Number(env.DELIVERY_INSIDE || 70), outside: Number(env.DELIVERY_OUTSIDE || 130),
      inside_label: env.DELIVERY_INSIDE_LABEL || 'Inside city' },
  };
  const headers = {
    'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Cache-Control': 'no-store', 'Vary': 'Origin',
  };
  const reply = (body, status = 200) => Response.json(body, { status, headers });
  const ok = (data) => reply({ ok: true, data });
  const fail = (error, status = 400) => reply({ ok: false, error }, status);

  async function catalog() {
    const results = await db('catalog');
    const products = results.map((p) => ({
      ...p, price: Number(p.price), in_stock: p.stock > 0, images: p.image ? [p.image] : [],
    }));
    const groups = new Map();
    const brands = new Set();
    for (const product of products) {
      if (product.brand_id) brands.add(product.brand_id);
      if (!product.group_id) continue;
      if (!groups.has(product.group_id)) groups.set(product.group_id, new Set());
      if (product.category_id) groups.get(product.group_id).add(product.category_id);
    }
    const entry = (id) => ({ id, name: id });
    return { shop, products, groups: [...groups].map(([id, categories]) => ({
      ...entry(id), categories: [...categories].map(entry),
    })), brands: [...brands].map(entry) };
  }

  function createOrder(payload) {
    const phone = phoneNorm(payload.phone);
    const name = String(payload.name || '').trim();
    const address = String(payload.address || '').trim();
    if (!name || !/^01\d{9}$/.test(phone) || address.length < 8)
      throw new Error('Valid name, phone and address are required');
    if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100)
      throw new Error('Invalid cart');
    if (payload.payment !== 'cod' && !(payload.payment === 'bkash' && shop.bkash.enabled))
      throw new Error('Invalid payment method');
    const clientRef = String(payload.client_ref || '');
    if (!/^[\w-]{8,100}$/.test(clientRef)) throw new Error('Invalid checkout reference');
    const quantities = new Map();
    for (const item of payload.items) {
      const qty = Number(item?.qty);
      if (!item?.product_id || !Number.isSafeInteger(qty) || qty < 1 || qty > 1000) throw new Error('Invalid quantity');
      const id = String(item.product_id);
      quantities.set(id, (quantities.get(id) || 0) + qty);
    }
    const area = payload.area === 'outside' ? 'outside' : 'inside';
    return db('place_order', {
      order_no: 'EE-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
      client_ref: clientRef, name, phone, address, area,
      note: String(payload.note || '').slice(0, 300), payment: payload.payment,
      bkash_sender: String(payload.bkash_sender || ''), bkash_trx: String(payload.bkash_trx || ''),
      delivery: shop.delivery[area], quantities: Object.fromEntries(quantities),
    });
  }

  function admin(action, payload) {
    switch (action) {
      case 'admin.products': return db('admin_products');
      case 'admin.orders': return db('admin_orders');
      case 'admin.product.upsert': {
        const p = payload.product || {};
        const price = Number(p.price);
        const stock = Number(p.stock);
        if (!p.id || !p.name || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647)
          throw new Error('Invalid product');
        return db('upsert_product', {
          id: p.id, name: p.name, sku: p.sku || '', description: p.description || '', price, stock,
          group_id: p.group_id || '', category_id: p.category_id || '', brand_id: p.brand_id || '',
          unit: p.unit || 'pcs', image: p.image || '', active: p.active === false ? 0 : 1,
        });
      }
      case 'admin.order.status':
        if (!['new', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(payload.status))
          throw new Error('Invalid status');
        return db('update_order_status', { order_no: String(payload.order_no || ''), status: payload.status });
      default: throw new Error('Unknown admin action');
    }
  }

  return async (request) => {
    const origin = request.headers.get('Origin');
    if (origin && origin !== allowed) return fail('Origin not allowed', 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return fail('POST required', 405);
    try {
      const { action, payload = {} } = await request.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail('Invalid request');
      if (action === 'shop.catalog') return ok(await catalog());
      if (action === 'shop.order.track')
        return ok(await db('track', { order_no: String(payload.order_no || ''), phone: phoneNorm(payload.phone) }));
      if (action === 'shop.order.create') {
        if (env.DATABASE_READ_ONLY === '1') return fail('Checkout is temporarily unavailable', 503);
        return ok(await createOrder(payload));
      }
      if (action === 'admin.sign_in') return ok(await auth.signIn(payload.login, payload.password));
      if (typeof action === 'string' && action.startsWith('admin.')) {
        if (!await auth.canManage(request.headers.get('Authorization'))) return fail('Unauthorized', 401);
        return ok(await admin(action, payload));
      }
      return fail('Unknown action', 404);
    } catch (error) {
      const message = error.message || 'Internal server error';
      if (message === 'Invalid username, email or password') return fail(message, 401);
      if (message === 'Too many sign-in attempts. Try again shortly.') return fail(message, 429);
      return fail(message, message.endsWith('temporarily unavailable') ? 503 : 400);
    }
  };
}
