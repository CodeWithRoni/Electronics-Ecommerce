import { useEffect, useState } from 'react';

const sections = [
  ['dashboard', 'Dashboard & Analytics', 'dashboard', [['overview', 'Overview'], ['monitoring', 'Live Monitoring']]],
  ['catalog', 'Catalog Management', 'box', [['products', 'Products & inventory'], ['taxonomy', 'Categories & Subcategories'], ['brands', 'Brands / Manufacturers']]],
  ['orders', 'Order Fulfillment', 'orders', [['orders', 'All Orders'], ['documents', 'Invoices & Slips'], [null, 'Returns & Exchanges']]],
  ['crm', 'Customer Relationship Management', 'user', [['customers', 'Customer Directory'], ['segments', 'Customer Segments'], [null, 'Support Tickets']]],
  ['marketing', 'Marketing & Promotions', 'gift', [[null, 'Discounts & Coupons'], ['banners', 'Flash Sales & Banners'], [null, 'Email & SMS Campaigns']]],
  ['content', 'Content Management', 'footer', [[null, 'Pages'], [null, 'Blog / Articles'], ['media', 'Media Library'], ['footer', 'Footer Settings']]],
  ['financials', 'Financials & Reports', 'reports', [['reports', 'Sales Reports'], [null, 'Tax & Shipping Reports'], [null, 'Payouts & Ledger']]],
  ['settings', 'System Configurations & Settings', 'settings', [['settings', 'General Settings'], [null, 'Payment Gateways'], [null, 'Shipping & Zones'], [null, 'Tax Rules'], [null, 'Notifications']]],
  ['access', 'Access Control & Security', 'lock', [[null, 'Admin Users'], [null, 'Roles & Permissions'], [null, 'Activity Logs']]],
  ['maintenance', 'System Maintenance', 'stock', [[null, 'Cache & Optimization'], [null, 'Backup & Restore'], ['health', 'System Health']]],
];

export default function AdminNavigation({ current, select, Icon }) {
  const activeGroup = sections.find(([, , , pages]) => pages.some(([id]) => id === current))?.[0];
  const [expanded, setExpanded] = useState(activeGroup);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setExpanded(activeGroup); }, [activeGroup]);

  return <>
    <button type="button" className="console-menu-toggle" aria-expanded={mobileOpen} aria-controls="admin-menu"
      onClick={() => setMobileOpen((open) => !open)}><Icon name="menu" /> Menu</button>
    <nav id="admin-menu" aria-label="Admin sections" className={`console-nav console-group-nav ${mobileOpen ? 'is-open' : ''}`}>
      {sections.map(([id, title, icon, pages]) => <section className="console-nav-group" key={id}>
        <button className="console-nav-heading" type="button" aria-expanded={expanded === id} aria-controls={`admin-nav-${id}`}
          data-current={activeGroup === id} onClick={() => setExpanded((open) => open === id ? '' : id)}>
          <Icon name={icon} size={17} /><span>{title}</span><span className="console-chevron" aria-hidden="true">⌄</span>
        </button>
        <ul id={`admin-nav-${id}`} hidden={expanded !== id}>
          {pages.map(([page, label]) => <li key={label}>{page ? <button type="button" aria-current={page === current ? 'page' : undefined} onClick={() => {
            select(page);
            setMobileOpen(false);
          }}>{label}</button> : <span className="console-nav-planned">{label}<small>Planned</small></span>}</li>)}
        </ul>
      </section>)}
    </nav>
  </>;
}
