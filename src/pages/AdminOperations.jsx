import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { money, fdatetime } from '../lib/format';

export function LiveMonitoring({ orders, lowStock, refresh, lastSync, busy }) {
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (!auto || busy) return;
    const id = setTimeout(refresh, 30000);
    return () => clearTimeout(id);
  }, [auto, busy, refresh]);
  return <section className="console-panel">
    <div className="console-panel-heading"><div><h2>Orders and stock alerts</h2><p>Last synced {lastSync?.toLocaleString()}</p></div>
      <label className="console-visibility"><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} /> Refresh every 30 seconds</label>
    </div>
    <h3>Latest orders</h3>
    {orders.length ? orders.slice(0, 10).map((order) => <div className="console-row" key={order.order_no}><strong>{order.order_no}</strong><span>{order.status} · {fdatetime(order.created_at)}</span></div>) : <p>No recent orders.</p>}
    <h3>Low stock</h3>
    {lowStock.length ? lowStock.map((product) => <div className="console-row" key={product.id}><span>{product.name}</span><strong>{product.stock} left</strong></div>) : <p>No low-stock products.</p>}
  </section>;
}

export function OrderDocuments({ orders, settings }) {
  const [id, setId] = useState('');
  const [kind, setKind] = useState('invoice');
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const order = orders.find(({ order_no }) => order_no === id);
  return <section className="console-panel console-documents">
    <form className="console-toolbar" onSubmit={async (event) => {
      event.preventDefault();
      if (!order || busy) return;
      setBusy(true);
      setError('');
      try { setDocument({ ...order, ...await api('shop.order.track', { order_no: id, phone: order.phone }), kind }); }
      catch (issue) { setError(issue.message); }
      finally { setBusy(false); }
    }}>
      <select aria-label="Order for document" required value={id} disabled={busy} onChange={(event) => { setId(event.target.value); setDocument(null); }}>
        <option value="">Choose a recent order</option>
        {orders.map(({ order_no, name }) => <option key={order_no} value={order_no}>{order_no} · {name}</option>)}
      </select>
      <select aria-label="Document type" value={kind} disabled={busy} onChange={(event) => { setKind(event.target.value); setDocument(null); }}>
        <option value="invoice">Order invoice</option><option value="packing">Packing slip</option>
      </select>
      <button type="submit" className="btn btn-primary" disabled={!order || busy}>{busy ? 'Loading…' : 'Preview'}</button>
      {document && <button type="button" className="btn" onClick={() => window.print()}>Print</button>}
    </form>
    {error && <p className="console-alert" role="alert">{error}</p>}
    {!orders.length && <p className="console-empty">Documents will be available when orders arrive.</p>}
    {document && <article className="console-order-document">
      <h2>{settings.shop_name || 'GearGrid'} · {document.kind === 'invoice' ? 'Order invoice' : 'Packing slip'}</h2>
      <p><strong>{document.order_no}</strong> · {fdatetime(document.created_at)}</p>
      <p>{document.name} · {document.phone}<br />{document.address}</p>
      <p>Order status: {document.status}</p>
      <table className="console-table"><thead><tr><th>Item</th><th>Quantity</th>{document.kind === 'invoice' && <th>Amount</th>}</tr></thead>
        <tbody>{document.items.map((item, index) => <tr key={index}><td>{item.name}</td><td>{item.qty} {item.unit}</td>{document.kind === 'invoice' && <td>{money(item.total, 'BDT')}</td>}</tr>)}</tbody></table>
      {document.kind === 'invoice' && <><p>Delivery: {money(document.delivery, 'BDT')}</p><p><strong>Total: {money(document.total, 'BDT')}</strong></p><p>Payment: {document.payment} · {document.payment_status}</p></>}
    </article>}
  </section>;
}

export function MediaLibrary({ products, settings, upload, busy }) {
  const [newAsset, setNewAsset] = useState('');
  const [copied, setCopied] = useState('');
  const entries = new Map();
  function include(url, usage) {
    if (!url) return;
    entries.set(url, [...(entries.get(url) || []), usage]);
  }
  include(settings.header_logo, 'Header logo');
  include(settings.footer?.logo || settings.footer_logo, 'Footer logo');
  include(settings.favicon, 'Browser icon');
  include(settings.banner_image, 'Homepage banner');
  products.forEach(({ name, image }) => include(image, name));
  include(newAsset, 'Just uploaded');
  return <section className="console-panel">
    <div className="console-panel-heading"><div><h2>Store images</h2><p>See the images currently used in your catalog and branding. Uploaded images appear here permanently once assigned to a product or setting.</p></div>
      <label>Upload image <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) upload(file, setNewAsset);
        event.target.value = '';
      }} /></label>
    </div>
    {entries.size ? <div className="console-media-grid">{[...entries].map(([url, uses]) => <article key={url}>
      <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={uses.join(', ')} loading="lazy" /></a>
      <p>{uses.join(', ')}</p>
      <button type="button" className="btn" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(url); }
        catch { setCopied('error'); }
      }}>{copied === url ? 'Copied' : 'Copy URL'}</button>
    </article>)}</div> : <p className="console-empty">No custom images in use yet.</p>}
    {copied === 'error' && <p role="alert">The browser could not copy the link. Open the image to copy its address.</p>}
  </section>;
}
