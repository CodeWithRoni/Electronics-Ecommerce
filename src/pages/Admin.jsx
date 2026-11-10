import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import { useShop } from '../lib/store';
import { money } from '../lib/format';
import { ImageField, StoreSettings, Taxonomy } from './AdminStore';
import AdminFooter from './AdminFooter';
import AdminNavigation from './AdminNavigation';
import { Customers, SalesReport } from './AdminInsights';
import { LiveMonitoring, MediaLibrary, OrderDocuments } from './AdminOperations';
import { pcSlots } from '../lib/pcBuilder';
import { brandIcon, brandLogo, brandName } from '../lib/brand';

const emptyProduct = { id: '', name: '', sku: '', description: '', price: 0, stock: 0, group_id: '', category_id: '', brand_id: '', image: '', unit: 'pcs', active: true };
const statuses = { new: 'New', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const productFields = [
  ['id', 'Product ID', true], ['sku', 'Model / SKU'],
  ['name', 'Product name', true], ['price', 'Price (BDT)', true, 'number'],
  ['stock', 'Stock quantity', true, 'number'],
];
const paths = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  box: 'm12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Zm0 18v-9m-9-4.5 9 4.5 9-4.5M7.5 5.3l9 4.5',
  stock: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6m-6 4h6',
  clock: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  refresh: 'M20 7v5h-5M4 17v-5h5m-4-1a7 7 0 0 1 12-5l3 4M4 14l3 4a7 7 0 0 0 12-5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6',
  footer: 'M3 4h18v16H3zM3 14h18M8 17h8',
  user: 'M4 21v-2a8 8 0 0 1 16 0v2M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  gift: 'M4 10h16v11H4zM3 7h18v4H3zM12 7v14',
  reports: 'M4 3v17h16M8 17v-5m5 5V8m5 9V5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  external: 'M13 4h7v7m0-7-9 9m7 1v6H4V6h6',
};

function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

async function request(token, action, payload = {}) {
  if (!API_URL) throw Error('API endpoint not configured');
  const form = payload instanceof FormData;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token && { Authorization: 'Bearer ' + token }) },
    body: form ? payload : JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data.data;
}

const sessionKey = `geargrid_admin_session:${API_URL}`;
function savedSession() {
  try { return sessionStorage.getItem(sessionKey) || ''; }
  catch { return ''; }
}
function saveSession(token) {
  try {
    if (token) sessionStorage.setItem(sessionKey, token);
    else sessionStorage.removeItem(sessionKey);
  } catch { /* Admin access still works in memory if storage is unavailable. */ }
}

function dashboardData(token) {
  return Promise.all([
    request(token, 'admin.products'), request(token, 'admin.orders'), request(token, 'admin.store'),
  ]);
}

function Brand() {
  return <div className="console-brand">
    <img className="console-brand-logo" src={brandLogo} alt={brandName} width="142" height="38" />
    <small>STORE ADMIN</small>
  </div>;
}

function Status({ value, label }) {
  return <span className={`console-status console-status-${value}`}>{label || statuses[value] || value}</span>;
}

function ProductEditor({ product, groups, brands, upload, existing, busy, error, onChange, onClose, onSave }) {
  const dialog = useRef(null);
  const title = existing ? 'Edit product' : 'Add product';
  const categories = groups.find(({ id }) => id === product.group_id)?.categories || [];
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
        <label key={key} className={`field ${key === 'name' ? 'console-wide' : ''}`}>
          <span>{label}</span>
          <input type={type} min={type === 'number' ? 0 : undefined} step={key === 'price' ? '0.01' : undefined}
            required={required} readOnly={existing && key === 'id'} value={product[key] ?? ''}
            onChange={(event) => onChange(key, event.target.value)} />
        </label>
      ))}
      <label className="field"><span>Group</span><select value={product.group_id || ''} onChange={(event) => onChange('group_id', event.target.value)}>
        <option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select></label>
      <label className="field"><span>Category</span><select disabled={!product.group_id} value={product.category_id || ''} onChange={(event) => onChange('category_id', event.target.value)}>
        <option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select></label>
      <label className="field"><span>Brand</span><select value={product.brand_id || ''} onChange={(event) => onChange('brand_id', event.target.value)}>
        <option value="">No brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
      </select></label>
      <label className="field"><span>Regular price before discount (BDT)</span>
        <input type="number" min="0.01" step="0.01" value={product.compare_at_price ?? ''} onChange={(event) => onChange('compare_at_price', event.target.value)} />
      </label>
      <fieldset className="console-wide console-builder-fields">
        <legend>PC Builder</legend>
        <label className="field"><span>Component type</span>
          <select value={product.pc_specs?.slot || ''} onChange={(event) => onChange('pc_specs', { ...product.pc_specs, slot: event.target.value })}>
            <option value="">Auto from category</option><option value="none">Exclude from builder</option>
            {pcSlots.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="field"><span>CPU socket (processor or motherboard)</span>
          <input maxLength={20} placeholder="AM5, LGA1700…" value={product.pc_specs?.socket || ''} onChange={(event) => onChange('pc_specs', { ...product.pc_specs, socket: event.target.value })} />
        </label>
        <label className="field"><span>Memory type (RAM or motherboard)</span>
          <select value={product.pc_specs?.memory || ''} onChange={(event) => onChange('pc_specs', { ...product.pc_specs, memory: event.target.value })}>
            <option value="">Unspecified</option>{['DDR3', 'DDR4', 'DDR5'].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="field"><span>Estimated power draw (W)</span>
          <input type="number" min="0" max="3000" step="1" placeholder="Unspecified" value={product.pc_specs?.watts ?? ''} onChange={(event) => onChange('pc_specs', { ...product.pc_specs, watts: event.target.value === '' ? null : Number(event.target.value) })} />
        </label>
      </fieldset>
      <div className="console-wide"><ImageField label="Product image" value={product.image} onChange={(value) => onChange('image', value)} upload={upload} busy={busy} /></div>
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
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(savedSession);
  const [restoring, setRestoring] = useState(Boolean(token));
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.title = ready ? 'GearGrid | Admin Dashboard' : 'GearGrid | Admin Login';
  }, [ready]);
  const [tab, setTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [store, setStore] = useState({ groups: [], brands: [], settings: {} });
  const [stockFilter, setStockFilter] = useState('all');
  const [editor, setEditor] = useState(null);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const refreshShop = useShop((state) => state.load);
  const shop = useShop((state) => state.catalog?.shop);

  const applyDashboard = useCallback(([nextProducts, nextOrders, nextStore]) => {
    setProducts(nextProducts);
    setOrders(nextOrders);
    setStore(nextStore);
    setLastSync(new Date());
    setReady(true);
  }, []);
  const refresh = async (sessionToken = token) => applyDashboard(await dashboardData(sessionToken));

  useEffect(() => {
    if (!token || ready) return;
    let active = true;
    dashboardData(token).then((data) => {
      if (!active) return;
      setRestoring(false);
      applyDashboard(data);
    }).catch((failure) => {
      if (!active) return;
      setRestoring(false);
      if (failure.status === 401) {
        saveSession('');
        setToken('');
        setError('Your session has expired. Sign in again.');
      } else {
        setError('Could not restore your session. Try again.');
      }
    });
    return () => { active = false; };
  }, [token, ready, restoreAttempt, applyDashboard]);

  const run = async (action) => {
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); }
    catch (failure) {
      if (token && failure.status === 401) {
        lock();
        setError('Your session has expired. Sign in again.');
      } else setError(failure.message);
    }
    finally { setBusy(false); }
  };
  const signIn = () => {
    const credentials = { login, password };
    setPassword('');
    return run(async () => {
      const session = await request('', 'admin.sign_in', credentials);
      await refresh(session.access_token);
      saveSession(session.access_token);
      setToken(session.access_token);
    });
  };
  const save = () => run(async () => {
    const edit = editor.product;
    const product = { ...edit, id: edit.id.trim(), name: edit.name.trim(), price: Number(edit.price), stock: Number(edit.stock) };
    if (!product.id || !product.name) throw Error('Product ID and name required');
    if (!editor.existing && products.some((item) => item.id === product.id)) throw Error('This product ID already exists. Open the existing product to edit it.');
    await request(token, 'admin.product.upsert', { product, create_only: !editor.existing, expected_stock: editor.originalStock });
    await refresh();
    await refreshShop();
    setEditor(null);
    setNotice('Product saved');
  });
  const changeStore = (action, payload, success, done) => run(async () => {
    await request(token, action, payload);
    await refresh();
    await refreshShop();
    done?.();
    setNotice(success);
  });
  const upload = (file, complete) => run(async () => {
    if (file.size > 3 * 1024 * 1024) throw Error('Choose an image up to 3 MB');
    const form = new FormData();
    form.set('file', file);
    const result = await request(token, '', form);
    complete(result.url);
    setNotice('Image uploaded. Save to publish it.');
  });
  const deleteProduct = (product) => {
    if (window.confirm(`Delete ${product.name} from the catalog? Past orders keep their product details.`)) {
      changeStore('admin.product.delete', { id: product.id }, 'Product deleted');
    }
  };
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
    saveSession('');
    setToken('');
    setRestoring(false);
    setPassword('');
    setReady(false);
    setProducts([]);
    setOrders([]);
    setEditor(null);
    setOrderFilter('all');
    setStockFilter('all');
    setStore({ groups: [], brands: [], settings: {} });
    switchSection('overview');
  };
  const openEditor = (product) => {
    setError('');
    setNotice('');
    setEditor({ existing: Boolean(product), originalStock: product?.stock, product: product ? { ...product, active: !!product.active } : { ...emptyProduct } });
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
        <img className="console-login-icon" src={brandIcon} alt="" width="56" height="56" />
        <h1 id="login-heading">Store administration</h1>
        {restoring ? <p role="status">Restoring your session…</p> : <>
        <p>Sign in with your GearGrid admin username or email and password.</p>
        <form onSubmit={(event) => { event.preventDefault(); signIn(); }}>
          <label className="field"><span>Username or email</span><input name="username" value={login} onChange={(event) => setLogin(event.target.value)} required autoComplete="username" autoCapitalize="none" spellCheck={false} /></label>
          <label className="field"><span>Password</span><input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {error && <p className="console-alert" role="alert">{error}</p>}
        {token && <button className="btn" type="button" disabled={busy} onClick={() => {
          setError('');
          setRestoring(true);
          setRestoreAttempt((attempt) => attempt + 1);
        }}>Retry session</button>}
        </>}
      </section>
    </main>
  </div>;

  const search = query.trim().toLowerCase();
  const matches = (fields) => fields.some((value) => String(value || '').toLowerCase().includes(search));
  const threshold = store.settings.low_stock_threshold ?? 5;
  const groupNames = Object.fromEntries(store.groups.map((group) => [group.id, group.name]));
  const brandNames = Object.fromEntries(store.brands.map((brand) => [brand.id, brand.name]));
  const filteredProducts = products.filter((product) =>
    (stockFilter === 'all' || (stockFilter === 'out' ? Number(product.stock) === 0 : Number(product.stock) <= threshold))
    && matches([product.name, product.id, product.sku, brandNames[product.brand_id], groupNames[product.group_id]]));
  const filteredOrders = orders.filter((order) => (orderFilter === 'all' || order.status === orderFilter) && matches([order.order_no, order.name, order.phone]));
  const pending = orders.filter((order) => order.status === 'new').length;
  const shipped = orders.filter((order) => order.status === 'shipped').length;
  const revenue = orders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock) <= threshold);
  const totalUnits = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const heading = {
    overview: 'Dashboard overview', products: 'Products & inventory', orders: 'All Orders',
    taxonomy: 'Categories & Subcategories', brands: 'Brands / Manufacturers', settings: 'General Settings',
    footer: 'Footer Settings', banners: 'Flash Sales & Banners', customers: 'Customer Directory',
    reports: 'Sales Reports', health: 'System Health', monitoring: 'Live Monitoring',
    documents: 'Invoices & Slips', segments: 'Customer Segments', media: 'Media Library',
  };
  const description = {
    overview: 'Review your latest orders, sales and stock levels.',
    products: 'Manage your catalog, prices, stock and storefront visibility.',
    orders: 'Find customer orders and update their fulfillment status.',
    taxonomy: 'Create, rename and remove groups, categories and brands.',
    settings: 'Control header branding, homepage banner and inventory alerts.',
    footer: 'Manage support, navigation, contact details, app buttons and social links.',
    brands: 'Organize your catalog by brand or manufacturer.',
    banners: 'Edit your homepage banner and manage product offers.',
    customers: 'Review customer activity from recent orders.',
    reports: 'Review delivered sales and order counts.',
    monitoring: 'Follow recent orders and low-stock alerts.',
    documents: 'Preview and print order invoices or packing slips.',
    segments: 'Find single-order and repeat customers from recent orders.',
    media: 'Find, upload and reuse storefront images.',
    health: 'Check when this session last synchronized with the store API.',
  };

  return <div className="console-shell">
    <aside className="console-sidebar">
      <Brand />
      <AdminNavigation current={tab} select={switchSection} Icon={Icon} />
      <div className="console-sidebar-actions">
        <a href="./"><Icon name="external" size={17} /> <span>View storefront</span></a>
        <button type="button" onClick={lock} disabled={busy}><Icon name="lock" size={17} /> <span>Sign out</span></button>
      </div>
    </aside>

    <main className="console-main">
      <header className="console-page-heading">
        <div><span className="console-kicker">STORE MANAGEMENT</span><h1>{heading[tab]}</h1><p>{description[tab]}</p></div>
        <button type="button" className="btn" disabled={busy} onClick={() => run(() => refresh())}><Icon name="refresh" size={17} /> Refresh</button>
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
            <div className="console-panel-heading"><div><h2>Low stock alerts</h2><p>Products with {threshold} units or fewer.</p></div><button className="btn" onClick={() => { switchSection('products'); setStockFilter('low'); }}>Manage stock</button></div>
            {lowStock.length ? lowStock.slice(0, 8).map((product) => <div className="console-row" key={product.id}><span>{product.name}</span><Status value={Number(product.stock) === 0 ? 'cancelled' : 'new'} label={`${product.stock} left`} /></div>) : <p className="console-empty">No products at or below {threshold} units.</p>}
          </section>
        </div>
        <section className="console-panel">
          <div className="console-panel-heading"><div><h2>Recent orders</h2><p>The latest orders received by your store.</p></div><button className="btn" onClick={() => switchSection('orders')}>View all orders</button></div>
          {orders.length ? orders.slice(0, 6).map((order) => <div className="console-row" key={order.order_no}><div><strong>{order.order_no}</strong><small>{order.name}</small></div><Status value={order.status} /></div>) : <p className="console-empty">No orders yet.</p>}
        </section>
      </> : tab === 'monitoring' ? <LiveMonitoring orders={orders} lowStock={lowStock} lastSync={lastSync} busy={busy} refresh={() => run(() => refresh())} />
        : tab === 'documents' ? <OrderDocuments orders={orders} settings={store.settings} />
        : tab === 'media' ? <MediaLibrary products={products} settings={store.settings} upload={upload} busy={busy} />
        : tab === 'customers' || tab === 'segments' ? <Customers key={tab} orders={orders} segmented={tab === 'segments'} /> : tab === 'reports' ? <SalesReport orders={orders} /> : tab === 'health' ? (
        <section className="console-panel"><h2>Store API</h2><p>Last successful data sync: {lastSync?.toLocaleString()}.</p></section>
      ) : tab === 'taxonomy' || tab === 'brands' ? (
        <Taxonomy key={tab} initialKind={tab === 'brands' ? 'brand' : 'group'} groups={store.groups} brands={store.brands} busy={busy}
          save={(entry, done) => changeStore('admin.taxonomy.save', entry, 'Catalog entry saved', done)}
          remove={(entry, done) => changeStore('admin.taxonomy.delete', entry, 'Catalog entry deleted', done)} />
      ) : tab === 'footer' ? (
        <AdminFooter settings={store.settings} shop={shop} busy={busy} upload={upload}
          save={(draft) => changeStore('admin.footer.save', draft, 'Footer settings saved')} />
      ) : tab === 'settings' || tab === 'banners' ? (
        <StoreSettings key={tab} section={tab} initial={store.settings} busy={busy} upload={upload}
          save={(draft) => changeStore('admin.settings.save', draft, 'Storefront settings saved')} />
      ) : (
        <section className="console-panel">
          <div className="console-panel-heading">
            <div><h2>{tab === 'products' ? 'Product catalog' : 'Order list'}</h2><p>{tab === 'products' ? `${filteredProducts.length} of ${products.length} products` : `${filteredOrders.length} of ${orders.length} recent orders`}</p></div>
            {tab === 'products' && <button className="btn btn-primary" disabled={busy} onClick={() => openEditor()}>+ Add product</button>}
          </div>
          <div className="console-toolbar">
            <input type="search" aria-label="Search admin records" placeholder={tab === 'products' ? 'Search product, model or brand' : 'Search order, name or phone'} value={query} onChange={(event) => setQuery(event.target.value)} />
            {tab === 'products' && <select aria-label="Filter stock" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
              <option value="all">All stock levels</option><option value="low">Low stock</option><option value="out">Out of stock</option>
            </select>}
            {tab === 'orders' && <select aria-label="Filter order status" value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
          </div>
          {tab === 'products' ? (
            filteredProducts.length ? <div className="console-table-scroll" tabIndex={0} role="region" aria-label="Product inventory table">
              <table className="console-table"><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead>
                <tbody>{filteredProducts.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{[product.id, groupNames[product.group_id], brandNames[product.brand_id]].filter(Boolean).join(' · ')}</small></td><td>{product.sku || '—'}</td><td>{money(product.price, 'BDT')}</td><td>{Number(product.stock) <= threshold ? <Status value={Number(product.stock) === 0 ? 'cancelled' : 'new'} label={`${product.stock} left`} /> : product.stock}</td><td><Status value={product.active ? 'delivered' : 'hidden'} label={product.active ? 'Visible' : 'Hidden'} /></td><td><div className="console-row-actions"><button className="btn" disabled={busy} onClick={() => openEditor(product)}>Edit</button><button className="btn console-danger" disabled={busy} onClick={() => deleteProduct(product)}>Delete</button></div></td></tr>)}</tbody>
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

    {editor && <ProductEditor product={editor.product} groups={store.groups} brands={store.brands} upload={upload} existing={editor.existing} busy={busy} error={error}
      onChange={(key, value) => setEditor((current) => ({ ...current, product: { ...current.product, ...(key === 'group_id' ? { category_id: '' } : {}), [key]: value } }))}
      onClose={() => { setEditor(null); setError(''); }} onSave={save} />}
  </div>;
}
