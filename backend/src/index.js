import { supabaseData, usesSupabase } from './supabase.js';

const reply = (data, status = 200, origin = '*') => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'Content-Type, Authorization', 'cache-control': 'no-store' }
});
const ok = (data, origin) => reply({ ok: true, data }, 200, origin);
const fail = (error, status, origin) => reply({ ok: false, error }, status, origin);
const phoneNorm = s => String(s || '').replace(/\D/g, '').replace(/^880/, '0');
const amount = n => Math.round(n * 100) / 100;
const getShop = env => ({
  name: env.SHOP_NAME || 'Electronics E-commerce', open: true, currency: 'BDT',
  address: env.SHOP_ADDRESS || '', phone: env.SHOP_PHONE || '', email: env.SHOP_EMAIL || '',
  notice: '', cod: true, bkash: { enabled: Boolean(env.BKASH_NUMBER), number: env.BKASH_NUMBER || '', type: 'personal' },
  delivery: { inside: Number(env.DELIVERY_INSIDE || 70), outside: Number(env.DELIVERY_OUTSIDE || 130),
    inside_label: env.DELIVERY_INSIDE_LABEL || 'Inside city' }
});
async function catalog(env) {
  const shop = getShop(env);
  const results = usesSupabase(env) ? await supabaseData(env, 'catalog')
    : (await env.DB.prepare('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC').all()).results;
  const products = results.map(p => ({ ...p, price: Number(p.price), in_stock: p.stock > 0,
    images: p.image ? [p.image] : [] }));
  const groups = [...new Set(products.map(p => p.group_id).filter(Boolean))].map(id => ({
    id, name: id, categories: [...new Set(products.filter(p => p.group_id === id).map(p => p.category_id).filter(Boolean))].map(c => ({ id: c, name: c }))
  }));
  const brands = [...new Set(products.map(p => p.brand_id).filter(Boolean))].map(id => ({ id, name: id }));
  return { shop, products, groups, brands };
}
async function createOrder(env, p) {
  const shop = getShop(env), phone = phoneNorm(p.phone);
  if (!String(p.name || '').trim() || !/^01\d{9}$/.test(phone) || String(p.address || '').trim().length < 8)
    throw new Error('Valid name, phone and address are required');
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 100) throw new Error('Invalid cart');
  if (!['cod', 'bkash'].includes(p.payment) || (p.payment === 'bkash' && !shop.bkash.enabled))
    throw new Error('Invalid payment method');
  const clientRef = String(p.client_ref || '');
  if (!/^[\w-]{8,100}$/.test(clientRef)) throw new Error('Invalid checkout reference');
  const useSupabase = usesSupabase(env);
  if (!useSupabase) {
    const prior = await env.DB.prepare('SELECT order_no,total,delivery,payment FROM orders WHERE client_ref=?').bind(clientRef).first();
    if (prior) return prior;
  }
  const quantities = new Map();
  for (const item of p.items) {
    const qty = Number(item.qty);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 1000) throw new Error('Invalid quantity');
    quantities.set(String(item.product_id), (quantities.get(String(item.product_id)) || 0) + qty);
  }
  const delivery = p.area === 'outside' ? shop.delivery.outside : shop.delivery.inside;
  const orderNo = 'EE-' + crypto.randomUUID().slice(0, 12).toUpperCase();
  if (useSupabase) {
    return supabaseData(env, 'place_order', {
      order_no: orderNo, client_ref: clientRef, name: String(p.name).trim(), phone,
      address: String(p.address).trim(), area: p.area === 'outside' ? 'outside' : 'inside',
      note: String(p.note || '').slice(0, 300), payment: p.payment,
      bkash_sender: String(p.bkash_sender || ''), bkash_trx: String(p.bkash_trx || ''),
      delivery, quantities: Object.fromEntries(quantities),
    });
  }
  const items = [];
  for (const [id, qty] of quantities) {
    const product = await env.DB.prepare('SELECT * FROM products WHERE id=? AND active=1').bind(id).first();
    if (!product || product.stock < qty) throw new Error('Product no longer sold or out of stock: ' + id);
    items.push({ product, qty, total: amount(product.price * qty) });
  }
  const total = amount(items.reduce((s, i) => s + i.total, 0) + delivery);
  const statements = [
    env.DB.prepare('INSERT INTO orders (order_no,client_ref,name,phone,address,area,note,payment,bkash_sender,bkash_trx,delivery,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(orderNo,clientRef,String(p.name).trim(),phone,String(p.address).trim(),p.area === 'outside' ? 'outside' : 'inside',
        String(p.note || '').slice(0,300),p.payment,String(p.bkash_sender || ''),String(p.bkash_trx || ''),delivery,total),
    ...items.map(({ product, qty }) => env.DB.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').bind(qty,product.id,qty)),
    ...items.map(({ product, qty, total: lineTotal }) => env.DB.prepare('INSERT INTO order_items (order_no,product_id,name,unit,qty,price,total) VALUES (?,?,?,?,?,?,?)')
      .bind(orderNo,product.id,product.name,product.unit,qty,product.price,lineTotal)),
    env.DB.prepare('INSERT INTO order_log (order_no,status) VALUES (?,?)').bind(orderNo,'new')
  ];
  await env.DB.batch(statements);
  return { order_no: orderNo, total, delivery, payment: p.payment };
}
async function track(env,p) {
  const phone = phoneNorm(p.phone);
  if (usesSupabase(env)) return supabaseData(env, 'track', { phone, order_no: String(p.order_no || '') });
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_no=? AND phone=?').bind(String(p.order_no || ''),phone).first();
  if (!o) throw new Error('Order not found');
  const { results: items } = await env.DB.prepare('SELECT name,unit,qty,total FROM order_items WHERE order_no=?').bind(o.order_no).all();
  const { results: log } = await env.DB.prepare('SELECT status,at FROM order_log WHERE order_no=? ORDER BY at').bind(o.order_no).all();
  return { order_no:o.order_no,status:o.status,created_at:o.created_at,items,log,delivery:o.delivery,total:o.total,
    payment:o.payment,payment_status:o.payment_status };
}
async function admin(env,action,p,req) {
  if (!env.ADMIN_TOKEN || req.headers.get('Authorization') !== 'Bearer ' + env.ADMIN_TOKEN)
    return { error: 'Unauthorized', status: 401 };
  if (action === 'admin.products') {
    if (usesSupabase(env)) return { data: await supabaseData(env, 'admin_products') };
    const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    return { data: results };
  }
  if (action === 'admin.product.upsert') {
    const x=p.product || {};
    if (!x.id || !x.name || !Number.isFinite(Number(x.price)) || Number(x.price)<0 || !Number.isSafeInteger(Number(x.stock)) || Number(x.stock)<0)
      throw new Error('Invalid product');
    const product = {
      id: x.id, name: x.name, sku: x.sku || '', description: x.description || '',
      price: Number(x.price), stock: Number(x.stock), group_id: x.group_id || '',
      category_id: x.category_id || '', brand_id: x.brand_id || '', unit: x.unit || 'pcs',
      image: x.image || '', active: x.active === false ? 0 : 1,
    };
    if (usesSupabase(env)) return { data: await supabaseData(env, 'upsert_product', product) };
    await env.DB.prepare(`INSERT INTO products (id,name,sku,description,price,stock,group_id,category_id,brand_id,unit,image,active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,sku=excluded.sku,description=excluded.description,price=excluded.price,
      stock=excluded.stock,group_id=excluded.group_id,category_id=excluded.category_id,brand_id=excluded.brand_id,
      unit=excluded.unit,image=excluded.image,active=excluded.active`)
      .bind(...[x.id,x.name,x.sku||'',x.description||'',Number(x.price),Number(x.stock),x.group_id||'',x.category_id||'',
        x.brand_id||'',x.unit||'pcs',x.image||'',x.active===false?0:1]).run();
    return { data: { id:x.id } };
  }
  if (action === 'admin.orders') {
    if (usesSupabase(env)) return { data: await supabaseData(env, 'admin_orders') };
    const { results } = await env.DB.prepare('SELECT order_no,name,phone,address,area,payment,payment_status,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 200').all();
    return { data: results };
  }
  if (action === 'admin.order.status') {
    if (!['new','confirmed','shipped','delivered','cancelled'].includes(p.status)) throw new Error('Invalid status');
    if (usesSupabase(env)) return { data: await supabaseData(env, 'update_order_status', {
      order_no: String(p.order_no || ''), status: p.status,
    }) };
    const result=await env.DB.prepare('UPDATE orders SET status=? WHERE order_no=?').bind(p.status,p.order_no).run();
    if (!result.meta.changes) throw new Error('Order not found');
    await env.DB.prepare('INSERT INTO order_log (order_no,status) VALUES (?,?)').bind(p.order_no,p.status).run();
    return { data: { order_no:p.order_no,status:p.status } };
  }
  throw new Error('Unknown admin action');
}
export default {
  async fetch(req,env) {
    const allowed=env.ALLOWED_ORIGIN || '*';
    const origin=req.headers.get('Origin') || '';
    const cors=allowed==='*' ? '*' : allowed;
    if (allowed!=='*' && origin && origin!==allowed) return fail('Origin not allowed',403,cors);
    if (req.method==='OPTIONS') return new Response(null,{status:204,headers:{
      'access-control-allow-origin':cors,'access-control-allow-methods':'POST, OPTIONS',
      'access-control-allow-headers':'Content-Type, Authorization'}});
    if (req.method!=='POST') return fail('POST required',405,cors);
    try {
      const { action,payload={} }=await req.json();
      if (env.DATABASE_READ_ONLY === '1' && ['shop.order.create', 'admin.product.upsert', 'admin.order.status'].includes(action)) {
        return fail('Orders and store updates are temporarily paused for maintenance', 503, cors);
      }
      if (action==='shop.catalog') return ok(await catalog(env),cors);
      if (action==='shop.order.create') return ok(await createOrder(env,payload),cors);
      if (action==='shop.order.track') return ok(await track(env,payload),cors);
      if (String(action).startsWith('admin.')) {
        const result=await admin(env,action,payload,req);
        return result.error ? fail(result.error,result.status,cors) : ok(result.data,cors);
      }
      return fail('Unknown action',404,cors);
    } catch(e) { return fail(e.message || 'Internal server error',400,cors); }
  }
};
