import { cleanRegistrationEmail, publishRegistrationEmail } from './registration-email.js';
import { pcSlots } from './pc-slots.js';
import { cleanFooter, cleanSettings, httpsUrl } from './settings.js';

const allowedPcSlots = new Set(['', 'none', ...pcSlots.map(({ id }) => id)]);

const phoneNorm = (value) => String(value || '').replace(/\D/g, '').replace(/^880/, '0');

export function createHandler(env, db, auth, consoleData, upload) {
  const allowed = env.ALLOWED_ORIGIN || 'https://codewithroni.github.io';
  const defaults = {
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

  function configuredShop(settings) {
    return {
      ...defaults,
      name: settings.shop_name || defaults.name,
      delivery: settings.shipping_zones || defaults.delivery,
      bkash: { ...defaults.bkash, ...settings.manual_bkash },
    };
  }

  async function catalog() {
    const [results, { settings, groups, brands, attributes = [] }] = await Promise.all([db('catalog'), consoleData('snapshot')]);
    const threshold = settings.low_stock_threshold ?? 5;
    const products = results.map((p) => ({
      ...p, price: Number(p.price), in_stock: p.stock > 0, low_stock: p.stock <= threshold,
      images: p.image ? [p.image] : [],
    }));
    const storefrontSettings = { ...settings };
    delete storefrontSettings.registration_email;
    return { shop: configuredShop(settings), products, groups, brands, attributes, settings: storefrontSettings };
  }

  async function createOrder(payload, customerId) {
    const phone = phoneNorm(payload.phone);
    const name = String(payload.name || '').trim();
    const address = String(payload.address || '').trim();
    // Bots fill the hidden "company" field; people never see it.
    if (String(payload.company || '').trim()) throw new Error('Your order could not be placed. Please try again.');
    if (!name || !/^01[3-9]\d{8}$/.test(phone) || address.length < 8)
      throw new Error('Valid name, phone and address are required');
    if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100)
      throw new Error('Invalid cart');
    const { settings } = await consoleData('snapshot');
    const shop = configuredShop(settings);
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
    }, customerId);
  }

  function admin(action, payload) {
    switch (action) {
      case 'admin.attribute.save': return consoleData('attribute_save', payload);
      case 'admin.attribute.delete': return consoleData('attribute_delete', payload);
      case 'admin.attribute.value.save': return consoleData('attribute_value_save', payload);
      case 'admin.attribute.value.delete': return consoleData('attribute_value_delete', payload);
      case 'admin.store': return Promise.resolve(consoleData('snapshot')).then((snapshot) => ({
        ...snapshot, registration_email_publish_available: Boolean(env.GEARGRID_AUTH_CONFIG_TOKEN),
      }));
      case 'admin.registration_email.save': return consoleData('settings_patch', { registration_email: cleanRegistrationEmail(payload) });
      case 'admin.registration_email.publish': return Promise.resolve(consoleData('snapshot')).then(({ settings }) => {
        if (!settings.registration_email) throw new Error('Save the registration email settings before publishing');
        return publishRegistrationEmail(env, settings.registration_email);
      });
      case 'admin.shipping.save': {
        const { inside, outside, inside_label } = payload;
        const label = typeof inside_label === 'string' ? inside_label.trim() : '';
        if (!label || label.length > 80 || ![inside, outside].every((rate) => Number.isSafeInteger(rate) && rate >= 0 && rate <= 100000))
          throw new Error('Enter a zone name and whole-number delivery rates between 0 and 100,000 BDT.');
        return consoleData('settings_patch', { shipping_zones: { inside, outside, inside_label: label } });
      }
      case 'admin.bkash.save': {
        const { enabled, type } = payload;
        const number = phoneNorm(payload.number);
        if (typeof enabled !== 'boolean' || !['personal', 'merchant'].includes(type) || ((enabled || number) && !/^01[3-9]\d{8}$/.test(number)))
          throw new Error('Enter a valid bKash number and account type.');
        return consoleData('settings_patch', { manual_bkash: { enabled, number, type } });
      }
      case 'admin.settings.save': return consoleData('settings_patch', cleanSettings(payload));
      case 'admin.footer.save': return consoleData('settings_patch', { footer: cleanFooter(payload) });
      case 'admin.taxonomy.import': {
        const { kind, rows } = payload;
        if (!['group', 'category', 'brand'].includes(kind) || !Array.isArray(rows) || rows.length < 1 || rows.length > 500)
          throw new Error('Import between 1 and 500 rows of the selected catalog type');
        return consoleData('taxonomy_import', { kind, rows });
      }
      case 'admin.taxonomy.save':
      case 'admin.taxonomy.delete': {
        const kind = payload.kind;
        const name = String(payload.name || '').trim();
        const groupId = String(payload.group_id || '');
        const id = String(payload.id || '');
        const saving = action.endsWith('.save');
        if (!['group', 'category', 'brand'].includes(kind) || (kind === 'category' && !groupId)
          || (saving ? !name || name.length > 100 : !id)) throw new Error('Enter a valid catalog name and group');
        return consoleData(saving ? 'taxonomy_save' : 'taxonomy_delete', {
          kind, id: id || crypto.randomUUID(), name, group_id: groupId,
        });
      }
      case 'admin.product.delete': {
        const id = String(payload.id || '');
        if (!id) throw new Error('Product ID required');
        return consoleData('product_delete', { id });
      }
      case 'admin.products': return db('admin_products');
      case 'admin.orders': return db('admin_orders');
      case 'admin.product.upsert': {
        const p = payload.product || {};
        const price = Number(p.price);
        const stock = Number(p.stock);
        if (!p.id || !p.name || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647)
          throw new Error('Invalid product');
        if (p.category_id && !p.group_id) throw new Error('Choose a product group for this category');
        const expected = payload.expected_stock;
        if (expected != null && (!Number.isSafeInteger(expected) || expected < 0 || expected > 2147483647))
          throw new Error('Invalid original stock');
        const details = {};
        if (Object.hasOwn(p, 'compare_at_price')) {
          const previous = p.compare_at_price === '' || p.compare_at_price == null ? null : Number(p.compare_at_price);
          if (previous !== null && (!Number.isFinite(previous) || previous <= price))
            throw new Error('Regular price must be higher than the selling price');
          details.compare_at_price = previous;
        }
        if (Object.hasOwn(p, 'pc_specs')) {
          const spec = p.pc_specs || {};
          const slot = String(spec.slot || '');
          const socket = String(spec.socket || '').trim().toUpperCase();
          const memory = String(spec.memory || '');
          const watts = spec.watts ?? null;
          if (!allowedPcSlots.has(slot)
            || (watts !== null && (!Number.isSafeInteger(watts) || watts < 0 || watts > 3000))
            || (socket && !/^[A-Z0-9 -]{2,20}$/.test(socket)) || !['', 'DDR3', 'DDR4', 'DDR5'].includes(memory))
            throw new Error('Choose valid PC Builder specifications');
          details.pc_specs = { slot, socket, memory, ...(watts !== null ? { watts } : {}) };
        }
        if (Object.hasOwn(p, 'attribute_value_ids')) {
          const values = p.attribute_value_ids;
          if (!Array.isArray(values) || values.length > 200 || values.some((id) =>
            typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) {
            throw new Error('Choose valid product attribute options');
          }
          details.attribute_value_ids = [...new Set(values)];
        }
        return consoleData('product_save', {
          id: p.id, name: p.name, sku: p.sku || '', description: p.description || '', price, stock,
          group_id: p.group_id || '', category_id: p.category_id || '', brand_id: p.brand_id || '',
          unit: p.unit || 'pcs', image: httpsUrl(p.image), active: p.active === false ? 0 : 1,
          create_only: payload.create_only === true, expected_stock: expected, ...details,
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
      if (request.headers.get('Content-Type')?.startsWith('multipart/form-data')) {
        if (!await auth.canManage(request.headers.get('Authorization'))) return fail('Unauthorized', 401);
        if (Number(request.headers.get('Content-Length')) > 3 * 1024 * 1024 + 16384)
          return fail('Choose an image up to 3 MB', 413);
        return ok(await upload((await request.formData()).get('file')));
      }
      const { action, payload = {} } = await request.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail('Invalid request');
      if (action === 'shop.catalog') return ok(await catalog());
      if (action === 'shop.order.track')
        return ok(await db('track', { order_no: String(payload.order_no || ''), phone: phoneNorm(payload.phone) }));
      if (action === 'customer.orders') {
        const customerId = await auth.customerId(request.headers.get('Authorization'));
        if (!customerId) return fail('Please log in to view your orders.', 401);
        const page = payload.page ?? 0;
        if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return fail('Invalid order page');
        return ok(await db('customer_orders', { p_customer_id: customerId, p_page: page }));
      }
      if (action === 'shop.order.create') {
        if (env.DATABASE_READ_ONLY === '1') return fail('Checkout is temporarily unavailable', 503);
        const header = request.headers.get('Authorization');
        const customerId = header ? await auth.customerId(header) : null;
        if (header && !customerId) return fail('Please log in again before placing your order.', 401);
        return ok(await createOrder(payload, customerId));
      }
      if (action === 'admin.sign_in') return ok(await auth.signIn(payload.login, payload.password));
      if (action === 'admin.refresh_session') return ok(await auth.refresh(payload.refresh_token));
      if (typeof action === 'string' && action.startsWith('admin.')) {
        if (!await auth.canManage(request.headers.get('Authorization'))) return fail('Unauthorized', 401);
        return ok(await admin(action, payload));
      }
      return fail('Unknown action', 404);
    } catch (error) {
      const message = error.message || 'Internal server error';
      if (message === 'Invalid username, email or password' || message === 'Your session has expired. Sign in again.') return fail(message, 401);
      if (message === 'Too many sign-in attempts. Try again shortly.') return fail(message, 429);
      return fail(message, message.endsWith('temporarily unavailable') ? 503 : 400);
    }
  };
}
