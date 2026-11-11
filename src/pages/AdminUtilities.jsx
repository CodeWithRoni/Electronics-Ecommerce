import { useEffect, useState } from 'react';
import { money } from '../lib/format';
import { useShop } from '../lib/store';
import { orderDate } from './AdminInsights';

export default function AdminUtilities({ tab, orders, busy, save }) {
  const load = useShop((state) => state.load);
  const shop = useShop((state) => state.catalog?.shop);
  const loading = useShop((state) => state.loading);
  const error = useShop((state) => state.error);
  const clearCache = useShop((state) => state.clearCatalogCache);
  const [cacheMessage, setCacheMessage] = useState('');
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('');
  const showsCheckout = tab === 'gateways' || tab === 'shipping';

  useEffect(() => {
    if (showsCheckout) load();
  }, [load, showsCheckout]);

  if (tab === 'cache') return <section className="console-panel">
    <h2>Browser catalog cache</h2>
    <p>Clear the locally saved catalog so the storefront loads current products on its next visit.</p>
    <button className="btn" type="button" disabled={loading} onClick={() => {
      try {
        clearCache();
        setCacheMessage('Catalog cache cleared in this browser.');
      } catch {
        setCacheMessage('This browser could not clear the catalog cache.');
      }
    }}>Clear catalog cache</button>
    {cacheMessage && <p role="status">{cacheMessage}</p>}
  </section>;

  if (showsCheckout) return <section className="console-panel">
    <div className="console-panel-heading">
      <div><h2>Current checkout configuration</h2><p>Changes apply to new checkout requests.</p></div>
      <button className="btn" type="button" disabled={loading} onClick={load}>Reload configuration</button>
    </div>
    {loading ? <p role="status">Loading checkout configuration…</p> : error ? <p role="alert">{error}</p> : shop && (
      <CheckoutSettings key={JSON.stringify([tab, shop.delivery, shop.bkash])} tab={tab} shop={shop} busy={busy} save={save} />
    )}
  </section>;

  const filtered = orders.filter((order) =>
    (!method || order.payment === method) && order.order_no.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="console-panel">
    <div className="console-panel-heading"><div><h2>Recent order payments</h2><p>Shows payment status recorded on orders.</p></div></div>
    <div className="console-toolbar">
      <input type="search" aria-label="Find order number" placeholder="Find order number" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)}>
        <option value="">All methods</option><option value="cod">Cash on delivery</option><option value="bkash">bKash</option>
      </select>
    </div>
    {filtered.length ? <div className="console-table-scroll" role="region" aria-label="Order payments" tabIndex={0}>
      <table className="console-table"><thead><tr>{['Order', 'Date', 'Method', 'Payment status', 'Order total'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{filtered.map((order) => <tr key={order.order_no}><td>{order.order_no}</td><td>{orderDate(order.created_at)}</td>
          <td>{order.payment === 'cod' ? 'Cash on delivery' : order.payment === 'bkash' ? 'bKash' : order.payment}</td>
          <td>{order.payment_status || 'Unrecorded'}</td><td>{money(order.total, 'BDT')}</td></tr>)}</tbody>
      </table>
    </div> : <p className="console-empty">No matching orders.</p>}
  </section>;
}


function CheckoutSettings({ tab, shop, busy, save }) {
  const isShipping = tab === 'shipping';
  const submit = (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (isShipping) {
      save('admin.shipping.save', {
        inside_label: fields.get('inside_label'), inside: Number(fields.get('inside')), outside: Number(fields.get('outside')),
      });
    } else {
      save('admin.bkash.save', { enabled: fields.has('enabled'), number: fields.get('number'), type: fields.get('type') });
    }
  };
  return <form className="console-product-form" onSubmit={submit}>
    {isShipping ? <>
      <label className="field console-wide">Inside delivery zone label<input name="inside_label" required maxLength={80} defaultValue={shop.delivery.inside_label} /></label>
      <label className="field">Inside delivery fee (BDT)<input name="inside" required type="number" min="0" max="100000" step="1" defaultValue={shop.delivery.inside} /></label>
      <label className="field">Outside delivery fee (BDT)<input name="outside" required type="number" min="0" max="100000" step="1" defaultValue={shop.delivery.outside} /></label>
    </> : <>
      <p className="console-wide">Cash on delivery is enabled. bKash payments use manual transaction verification.</p>
      <label className="console-visibility console-wide"><input type="checkbox" name="enabled" defaultChecked={shop.bkash.enabled} /> Enable bKash</label>
      <label className="field">bKash number<input name="number" type="tel" defaultValue={shop.bkash.number} /></label>
      <label className="field">Account type<select name="type" defaultValue={shop.bkash.type}><option value="personal">Personal</option><option value="merchant">Merchant</option></select></label>
    </>}
    <div className="console-wide"><button className="btn btn-primary" disabled={busy}>Save changes</button></div>
  </form>;
}
