import { useEffect, useState } from 'react';
import { money } from '../lib/format';
import { useShop } from '../lib/store';
import { orderDate } from './AdminInsights';

export default function AdminUtilities({ tab, orders }) {
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
      <div><h2>Current checkout configuration</h2><p>These values are managed in the store backend.</p></div>
      <button className="btn" type="button" disabled={loading} onClick={load}>Reload configuration</button>
    </div>
    {loading ? <p role="status">Loading checkout configuration…</p> : error ? <p role="alert">{error}</p> : shop && (
      tab === 'gateways' ? <>
        <div className="console-row"><span>Cash on delivery</span><strong>{shop.cod ? 'Enabled' : 'Disabled'}</strong></div>
        <div className="console-row"><span>bKash</span><strong>{shop.bkash?.enabled ? 'Enabled' : 'Disabled'}</strong></div>
      </> : <>
        <div className="console-row"><span>{shop.delivery.inside_label}</span><strong>{money(shop.delivery.inside, shop.currency)}</strong></div>
        <div className="console-row"><span>Outside delivery zone</span><strong>{money(shop.delivery.outside, shop.currency)}</strong></div>
      </>
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
