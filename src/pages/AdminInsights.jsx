import { useState } from 'react';
import { money } from '../lib/format';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
});
function orderDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return '';
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function weekOf(day) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}

export function Customers({ orders, segmented = false }) {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('all');
  const directory = new Map();
  for (const order of orders) {
    if (!order.phone) continue;
    const entry = directory.get(order.phone) || { name: order.name, phone: order.phone, orders: 0, delivered: 0 };
    entry.orders++;
    if (order.status === 'delivered') entry.delivered += Number(order.total || 0);
    directory.set(order.phone, entry);
  }
  const customers = [...directory.values()].filter(({ name, phone, orders }) =>
    (segment === 'all' || (segment === 'repeat' ? orders > 1 : orders === 1))
    && [name, phone].some((value) => String(value || '').toLowerCase().includes(query.trim().toLowerCase())));
  return <section className="console-panel">
    <div className="console-panel-heading"><div><h2>Customers from orders</h2><p>Grouped by phone number from the latest {orders.length} orders.</p></div></div>
    <div className="console-toolbar"><input type="search" aria-label="Find customer" placeholder="Search name or phone" value={query} onChange={(event) => setQuery(event.target.value)} />{segmented && <select aria-label="Customer segment" value={segment} onChange={(event) => setSegment(event.target.value)}><option value="all">All customers</option><option value="single">One order</option><option value="repeat">Repeat customers</option></select>}</div>
    {customers.length ? <div className="console-table-scroll"><table className="console-table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Delivered order value</th></tr></thead>
      <tbody>{customers.map((entry) => <tr key={entry.phone}><td>{entry.name}</td><td>{entry.phone}</td><td>{entry.orders}</td><td>{money(entry.delivered, 'BDT')}</td></tr>)}</tbody>
    </table></div> : <p className="console-empty">No customers to show.</p>}
  </section>;
}

export function SalesReport({ orders }) {
  const [period, setPeriod] = useState('month');
  const summaries = new Map();
  for (const order of orders) {
    const day = orderDate(order.created_at);
    if (!day) continue;
    const key = period === 'day' ? day : period === 'week' ? weekOf(day) : period === 'month' ? day.slice(0, 7) : day.slice(0, 4);
    const row = summaries.get(key) || { orders: 0, delivered: 0, amount: 0 };
    row.orders++;
    if (order.status === 'delivered') { row.delivered++; row.amount += Number(order.total || 0); }
    summaries.set(key, row);
  }
  return <section className="console-panel">
    <div className="console-panel-heading"><div><h2>Delivered sales by period</h2><p>Uses the latest {orders.length} orders and their placement dates in Dhaka time.</p></div></div>
    <div className="console-toolbar"><select aria-label="Report period" value={period} onChange={(event) => setPeriod(event.target.value)}>
      <option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option>
    </select></div>
    {summaries.size ? <div className="console-table-scroll"><table className="console-table">
      <thead><tr><th>{period === 'week' ? 'Week starting Monday' : 'Period'}</th><th>Orders</th><th>Delivered</th><th>Delivered order value</th></tr></thead>
      <tbody>{[...summaries].sort(([a], [b]) => b.localeCompare(a)).map(([date, row]) => <tr key={date}><td>{date}</td><td>{row.orders}</td><td>{row.delivered}</td><td>{money(row.amount, 'BDT')}</td></tr>)}</tbody>
    </table></div> : <p className="console-empty">No orders to report yet.</p>}
  </section>;
}
