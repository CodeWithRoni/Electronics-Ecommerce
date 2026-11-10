import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import { useShop } from '../lib/store';
import { money } from '../lib/format';

const emptyProduct = { id: '', name: '', sku: '', description: '', price: 0, stock: 0, group_id: '', category_id: '', brand_id: '', image: '', unit: 'pcs', active: true };
const statuses = { new: 'New', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const sections = [
  ['overview', 'Overview', 'dashboard'],
  ['products', 'Products & inventory', 'box'],
  ['orders', 'Customer orders', 'orders'],
];
const productFields = [
  ['id', 'Product ID', true], ['sku', 'Model / SKU'],
  ['name', 'Product name', true], ['price', 'Price (BDT)', true, 'number'],
  ['stock', 'Stock quantity', true, 'number'], ['group_id', 'Category / group'],
  ['category_id', 'Subcategory'], ['brand_id', 'Brand'], ['image', 'Image URL (https://...)'],
];
const paths = {
  bolt: 'm13 2-9 12h7l-1 8 10-12h-7l1-8Z',
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  box: 'm12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Zm0 18v-9m-9-4.5 9 4.5 9-4.5M7.5 5.3l9 4.5',
  stock: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6m-6 4h6',
  clock: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  refresh: 'M20 7v5h-5M4 17v-5h5m-4-1a7 7 0 0 1 12-5l3 4M4 14l3 4a7 7 0 0 0 12-5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2',
  external: 'M13 4h7v7m0-7-9 9m7 1v6H4V6h6',
};

function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

async function request(token, action, payload = {}) {
  if (!API_URL) throw Error('API endpoint not configured');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw Error(data.error || 'Request failed');
  return data.data;
}

function Brand() {
  return <div className="console-brand">
    <span className="console-mark"><Icon name="bolt" size={23} /></span>
    <div><strong>Electronics E-commerce</strong><small>STORE ADMIN</small></div>
  </div>;
}

function Status({ value, label }) {
  return <span className={`console-status console-status-${value}`}>{label || statuses[value] || value}</span>;
}

function ProductEditor({ product, existing, busy, error, onChange, onClose, onSave }) {
  const dialog = useRef(null);
  const title = existing ? 'Edit product' : 'Add product';
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} className="console-dialog" aria-labelledby="editor-title" onCancel={(event) => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <div className="console-dialog-heading">
      <div><h2 id="editor-title">{title}</h2><p>Update the catalog details customers see.</p></div>
      <button type="button" className="btn" onClick={onClose} disabled={busy}>Close</button>
    </div>
    <form className="console-product-form" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      {productFields.map(([key, label, required, type = 'text']) => (
        <label key={key} className={`field ${['name', 'image'].includes(key) ? 'console-wide' : ''}`}>
          <span>{label}</span>
          <input type={type} min={type === 'number' ? 0 : undefined} step={key === 'price' ? '0.01' : undefined}
            required={required} readOnly={existing && key === 'id'} value={product[key] ?? ''}
            onChange={(event) => onChange(key, event.target.value)} />
        </label>
      ))}
      <label className="field console-wide"><span>Description / specifications</span><textarea value={product.description || ''} onChange={(event) => onChange('description', event.target.value)} /></label>
      <label className="console-visibility console-wide"><input type="checkbox" checked={!!product.active} onChange={(event) => onChange('active', event.target.checked)} /> Show on storefront</label>
      {error && <p className="console-alert console-wide" role="alert">{error}</p>}
      <div className="console-dialog-actions console-wide">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
      </div>
    </form>
  </dialog>;
}

export default function Admin() {
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editor, setEditor] = useState(null);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refreshShop = useShop((state) => state.load);

  const refresh = async () => {
    const [nextProducts, nextOrders] = await Promise.all([request(token, 'admin.products'), request(token, 'admin.orders')]);
    setProducts(nextProducts);
    setOrders(nextOrders);
    setReady(true);
  };
  const run = async (action) => {
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const save = () => run(async () => {
    const edit = editor.product;
    const product = { ...edit, id: edit.id.trim(), name: edit.name.trim(), price: Number(edit.price), stock: Number(edit.stock) };
    if (!product.id || !product.name) throw Error('Product ID and name required');
    if (!editor.existing && products.some((item) => item.id === product.id)) throw Error('This product ID already exists. Open the existing product to edit it.');
    await request(token, 'admin.product.upsert', { product });
    await refresh();
    await refreshShop();
    setEditor(null);
    setNotice('Product saved');
  });
  const updateStatus = (order, value) => {
    if (!window.confirm(`Change order ${order.order_no} to ${statuses[value]}?`)) return;
    run(async () => {
      await request(token, 'admin.order.status', { order_no: order.order_no, status: value });
      await refresh();
      setNotice('Order updated');
    });
  };
  const switchSection = (section) => {
    setTab(section);
    setQuery('');
    setError('');
    setNotice('');
  };
  const lock = () => {
    setToken('');
    setReady(false);
    setProducts([]);
    setOrders([]);
    setEditor(null);
    setOrderFilter('all');
    switchSection('overview');
  };
  const openEditor = (product) => {
    setError('');
    setNotice('');
    setEditor({ existing: Boolean(product), product: product ? { ...product, active: !!product.active } : { ...emptyProduct } });
  };

  if (!ready) return <div className="console-gate">
    <header className="console-gate-header"><Brand /><a href="./">View storefront <Icon name="external" size={15} /></a></header>
    <main className="console-gate-main">
      <div className="console-gate-intro">
        <span className="console-kicker">STORE MANAGEMENT</span>
        <h2>Manage your catalog and orders<span>.</span></h2>
        <p>Update your catalog, check inventory and follow customer orders from one workspace.</p>
      </div>
      <section className="console-login" aria-labelledby="login-heading">
        <div className="console-icon"><Icon name="lock" size={23} /></div>
        <h1 id="login-heading">Store administration</h1>
        <p>Enter your GearGrid admin access token to unlock the dashboard.</p>
        <form onSubmit={(event) => { event.preventDefault(); run(refresh); }}>
          <label className="field"><span>Admin access token</span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} required autoComplete="off" /></label>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock dashboard'}</button>
        </form>
        {error && <p className="console-alert" role="alert">{error}</p>}
      </section>
    </main>
  </div>;

  const search = query.trim().toLowerCase();
  const matches = (fields) => fields.some((value) => String(value || '').toLowerCase().includes(search));
  const filteredProducts = products.filter((product) => matches([product.name, product.id, product.sku, product.brand_id, product.group_id]));
  const filteredOrders = orders.filter((order) => (orderFilter === 'all' || order.status === orderFilter) && matches([order.order_no, order.name, order.phone]));
  const pending = orders.filter((order) => order.status === 'new').length;
  const shipped = orders.filter((order) => order.status === 'shipped').length;
  const revenue = orders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock) <= 5);
  const totalUnits = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const heading = { overview: 'Dashboard overview', products: 'Products & inventory', orders: 'Customer orders' };
  const description = {
    overview: 'Review your latest orders, sales and stock levels.',
    products: 'Manage your catalog, prices, stock and storefront visibility.',
    orders: 'Find customer orders and update their fulfillment status.',
  };

  return <div className="console-shell">
    <aside className="console-sidebar">
      <Brand />
      <nav aria-label="Admin sections" className="console-nav">
        {sections.map(([key, label, icon]) => <button type="button" key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => switchSection(key)}><Icon name={icon} /> <span>{label}</span></button>)}
      </nav>
      <div className="console-sidebar-actions">
        <a href="./"><Icon name="external" size={17} /> <span>View storefront</span></a>
        <button type="button" onClick={lock} disabled={busy}><Icon name="lock" size={17} /> <span>Lock dashboard</span></button>
      </div>
    </aside>

    <main className="console-main">
      <header className="console-page-heading">
        <div><span className="console-kicker">STORE MANAGEMENT</span><h1>{heading[tab]}</h1><p>{description[tab]}</p></div>
        <button type="button" className="btn" disabled={busy} onClick={() => run(refresh)}><Icon name="refresh" size={17} /> Refresh</button>
      </header>
      {error && !editor && <p className="console-alert" role="alert">{error}</p>}
      {notice && <p className="console-notice" role="status">{notice}</p>}

      {tab === 'overview' ? <>
        <section className="console-stats" aria-label="Store totals">
          {[['Products', products.length, 'box'], ['Available units', totalUnits, 'stock'], ['Recent orders', orders.length, 'orders'], ['Pending orders', pending, 'clock']].map(([label, value, icon]) => (
            <div key={label} className="console-stat"><div className="console-icon"><Icon name={icon} /></div><div><span>{label}</span><strong>{value}</strong></div></div>
          ))}
        </section>
        <div className="console-insights">
          <section className="console-panel">
            <div className="console-panel-heading"><div><h2>Sales summary</h2><p>Based on the latest {orders.length} orders.</p></div></div>
            <div className="console-sales"><span>Delivered order value</span><strong>{money(revenue, 'BDT')}</strong></div>
            <div className="console-row"><span>Awaiting confirmation</span><strong>{pending}</strong></div>
            <div className="console-row"><span>Shipped orders</span><strong>{shipped}</strong></div>
          </section>
          <section className="console-panel">
            <div className="console-panel-heading"><div><h2>Low stock alerts</h2><p>Products with 5 units or fewer.</p></div><button className="btn" onClick={() => switchSection('products')}>Manage stock</button></div>
            {lowStock.length ? lowStock.slice(0, 8).map((product) => <div className="console-row" key={product.id}><span>{product.name}</span><Status value={Number(product.stock) === 0 ? 'cancelled' : 'new'} label={`${product.stock} left`} /></div>) : <p className="console-empty">No products at or below 5 units.</p>}
          </section>
        </div>
        <section className="console-panel">
          <div className="console-panel-heading"><div><h2>Recent orders</h2><p>The latest orders received by your store.</p></div><button className="btn" onClick={() => switchSection('orders')}>View all orders</button></div>
          {orders.length ? orders.slice(0, 6).map((order) => <div className="console-row" key={order.order_no}><div><strong>{order.order_no}</strong><small>{order.name}</small></div><Status value={order.status} /></div>) : <p className="console-empty">No orders yet.</p>}
        </section>
      </> : (
        <section className="console-panel">
          <div className="console-panel-heading">
            <div><h2>{tab === 'products' ? 'Product catalog' : 'Order list'}</h2><p>{tab === 'products' ? `${filteredProducts.length} of ${products.length} products` : `${filteredOrders.length} of ${orders.length} recent orders`}</p></div>
            {tab === 'products' && <button className="btn btn-primary" disabled={busy} onClick={() => openEditor()}>+ Add product</button>}
          </div>
          <div className="console-toolbar">
            <input type="search" aria-label="Search admin records" placeholder={tab === 'products' ? 'Search product, model or brand' : 'Search order, name or phone'} value={query} onChange={(event) => setQuery(event.target.value)} />
            {tab === 'orders' && <select aria-label="Filter order status" value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
          </div>
          {tab === 'products' ? (
            filteredProducts.length ? <div className="console-table-scroll" tabIndex={0} role="region" aria-label="Product inventory table">
              <table className="console-table"><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead>
                <tbody>{filteredProducts.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.id}</small></td><td>{product.sku || '—'}</td><td>{money(product.price, 'BDT')}</td><td>{product.stock}</td><td><Status value={product.active ? 'delivered' : 'hidden'} label={product.active ? 'Visible' : 'Hidden'} /></td><td><button className="btn" disabled={busy} onClick={() => openEditor(product)}>Edit</button></td></tr>)}</tbody>
              </table>
            </div> : <p className="console-empty">{products.length ? 'No products match your search.' : 'No products yet. Add your first product to the catalog.'}</p>
          ) : (
            filteredOrders.length ? <div className="console-table-scroll" tabIndex={0} role="region" aria-label="Customer orders table">
              <table className="console-table"><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>{filteredOrders.map((order) => <tr key={order.order_no}><td><strong>{order.order_no}</strong><small>{order.created_at}</small></td><td>{order.name}<small>{order.phone} · {order.address}</small></td><td>{order.payment}<small>{order.payment_status}</small></td><td>{money(order.total, 'BDT')}</td><td><select className={`console-status-${order.status}`} aria-label={`Order status ${order.order_no}`} value={order.status} disabled={busy} onChange={(event) => updateStatus(order, event.target.value)}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td></tr>)}</tbody>
              </table>
            </div> : <p className="console-empty">{orders.length ? 'No orders match your filters.' : 'No orders received yet.'}</p>
          )}
        </section>
      )}
    </main>

    {editor && <ProductEditor product={editor.product} existing={editor.existing} busy={busy} error={error}
      onChange={(key, value) => setEditor((current) => ({ ...current, product: { ...current.product, [key]: value } }))}
      onClose={() => { setEditor(null); setError(''); }} onSave={save} />}
  </div>;
}
