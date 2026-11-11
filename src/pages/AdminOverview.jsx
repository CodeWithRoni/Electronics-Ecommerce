import { useState } from 'react';
import { money } from '../lib/format';
import { orderDate } from './AdminInsights';

const dayLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short', day: 'numeric' });
const syncLabel = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});
const dayInMs = 86400000;

export default function AdminOverview({
  Icon, Status, statuses, shopName, products, orders, lowStock, threshold, lastSync, busy,
  addProduct, openProduct, openOrders, openInventory, openReports,
}) {
  const counts = Object.fromEntries(Object.keys(statuses).map((status) => [status, 0]));
  for (const order of orders) {
    if (Object.hasOwn(counts, order.status)) counts[order.status]++;
  }
  const urgentStock = [...lowStock].sort((a, b) => Number(a.stock) - Number(b.stock));
  const outOfStock = urgentStock.filter((product) => Number(product.stock) === 0).length;
  const units = products.reduce((total, item) => total + Number(item.stock || 0), 0);
  const metrics = [
    { label: 'Catalog products', value: products.length, detail: `${units.toLocaleString()} units in inventory`, icon: 'box', action: () => openInventory() },
    { label: 'Recent orders', value: orders.length, detail: 'Orders in this snapshot', icon: 'orders', action: () => openOrders() },
    { label: 'Awaiting confirmation', value: counts.new, detail: 'Review new orders', icon: 'clock', action: () => openOrders('new') },
    { label: 'Low stock', value: lowStock.length, detail: `${threshold} units or fewer`, icon: 'stock', action: () => openInventory('low') },
  ];
  return <>
    <section className="overview-hero" aria-labelledby="overview-store">
      <div>
        <span className="overview-eyebrow">STORE WORKSPACE</span>
        <h2 id="overview-store">{shopName}</h2>
        <p>{lastSync && <>Last synced <time dateTime={lastSync.toISOString()}>{syncLabel.format(lastSync)} (Dhaka)</time></>}</p>
      </div>
      <div className="overview-actions">
        <button type="button" className="btn overview-orders-button" onClick={() => openOrders()}><Icon name="orders" size={17} /> View all orders</button>
        <button type="button" className="btn overview-add-button" disabled={busy} onClick={addProduct}><span aria-hidden="true">+</span> Add product</button>
      </div>
    </section>

    <section className="console-stats overview-metrics" aria-label="Store snapshot">
      {metrics.map(({ label, value, detail, icon, action }) => <button key={label} type="button" className="overview-metric" onClick={action}>
        <div className="overview-metric-head"><span className="console-icon"><Icon name={icon} size={19} /></span><span className="overview-arrow"><Icon name="external" size={15} /></span></div>
        <span className="overview-metric-label">{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small>
      </button>)}
    </section>

    <div className="overview-grid">
      <SalesChart orders={orders} lastSync={lastSync} openReports={openReports} />
      <section className="console-panel overview-panel" aria-labelledby="overview-fulfillment">
        <div className="console-panel-heading"><div><h2 id="overview-fulfillment">Order fulfillment</h2><p>Status across the latest {orders.length} orders.</p></div></div>
        <div className="overview-fulfillment-list">{Object.entries(statuses).map(([status, label]) => {
          const count = counts[status];
          return <button key={status} type="button" className="overview-status-row" onClick={() => openOrders(status)}>
            <span className="overview-status-label"><span className="overview-dot" data-status={status} />{label}</span>
            <span className="overview-track" aria-hidden="true"><span data-status={status} style={{ width: `${orders.length ? count / orders.length * 100 : 0}%` }} /></span>
            <strong>{count}</strong>
          </button>;
        })}</div>
      </section>

      <section className="console-panel overview-panel">
        <div className="console-panel-heading"><div><h2>Recent orders</h2><p>Open an order to review its details and status.</p></div></div>
        {orders.length > 0 ? <div className="console-table-scroll" tabIndex={0} role="region" aria-label="Recent orders table">
          <table className="console-table overview-table">
            <thead><tr><th scope="col">Order</th><th scope="col">Status</th><th scope="col">Total</th></tr></thead>
            <tbody>{orders.slice(0, 5).map((order) => <tr key={order.order_no}>
              <td><button className="overview-order-link" type="button" onClick={() => openOrders('all', order.order_no)}>{order.order_no}</button><small>{order.name}</small></td>
              <td><Status value={order.status} /></td><td>{money(order.total, 'BDT')}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="console-empty">New orders will appear here.</p>}
      </section>

      <section className="console-panel overview-panel">
        <div className="console-panel-heading"><div><h2>Low stock alerts</h2><p>Out-of-stock products appear first.</p></div>
          <div className="console-row-actions">
            {outOfStock > 0 && <button type="button" className="btn" onClick={() => openInventory('out')}>Out of stock ({outOfStock})</button>}
            <button type="button" className="btn" onClick={() => openInventory('low')}>Manage stock</button>
          </div></div>
        {urgentStock.length ? urgentStock.slice(0, 5).map((product) => <div className="console-row" key={product.id}>
          <button type="button" className="overview-order-link" disabled={busy} onClick={() => openProduct(product)}>{product.name}</button>
          <Status value={Number(product.stock) === 0 ? 'cancelled' : 'new'} label={Number(product.stock) === 0 ? 'Out of stock' : `${product.stock} left`} />
        </div>) : <p className="console-empty">No products at or below {threshold} units.</p>}
      </section>
    </div>
  </>;
}

function SalesChart({ orders, lastSync, openReports }) {
  const [period, setPeriod] = useState(7);
  const today = Date.parse(orderDate(lastSync || Date.now()));
  const days = Array.from({ length: period }, (_, index) => new Date(today - (period - 1 - index) * dayInMs).toISOString().slice(0, 10));
  const totals = new Map(days.map((day) => [day, 0]));
  for (const order of orders) {
    if (order.status !== 'delivered') continue;
    const day = orderDate(order.created_at);
    if (totals.has(day)) totals.set(day, totals.get(day) + Number(order.total || 0));
  }
  const values = [...totals.values()];
  const peak = Math.max(0, ...values);
  const amount = values.reduce((sum, value) => sum + value, 0);
  const tickDays = period === 7 ? days : [days[0], days[9], days[19], days[29]];
  return <section className="console-panel overview-panel overview-sales" aria-labelledby="overview-sales">
    <div className="console-panel-heading"><div><h2 id="overview-sales">Delivered sales</h2><p>By order placement date, Dhaka time. Uses the latest {orders.length} orders.</p></div>
      <div className="overview-period" role="group" aria-label="Sales date range">{[7, 30].map((days) => <button type="button" key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} days</button>)}</div>
    </div>
    <div className="overview-sales-total"><strong>{money(amount, 'BDT')}</strong><span>Delivered order value</span></div>
    {peak ? <div className="overview-plot">
      <div className="overview-bars" aria-hidden="true" style={{ '--chart-days': period }}>
        {[...totals].map(([day, value]) => <div key={day} className="overview-bar-cell" title={`${dayLabel.format(new Date(day))}: ${money(value, 'BDT')}`}><div className="overview-bar" style={{ height: `${value / peak * 100}%` }} /></div>)}
      </div>
      <div className="overview-ticks" aria-hidden="true">{tickDays.map((day) => <span key={day}>{dayLabel.format(new Date(day))}</span>)}</div>
      <details className="overview-chart-details"><summary>Daily values</summary><dl>
        {[...totals].map(([day, value]) => <div key={day}><dt>{dayLabel.format(new Date(day))}</dt><dd>{money(value, 'BDT')}</dd></div>)}
      </dl></details>
    </div> : <p className="overview-chart-empty">No delivered sales in the last {period} days.</p>}
    <button type="button" className="overview-order-link" onClick={openReports}>Open sales reports <span aria-hidden="true">→</span></button>
  </section>;
}
