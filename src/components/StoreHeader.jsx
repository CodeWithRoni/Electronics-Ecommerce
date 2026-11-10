import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RetailIcon } from './retail';
import { brandIcon, brandLogo, brandName } from '../lib/brand';
import { CartIcon, SearchIcon } from './ui';

function HeaderAction({ icon, title, caption }) {
  return <><RetailIcon name={icon} size={21} /><span><b>{title}</b><small>{caption}</small></span></>;
}

export default function StoreHeader({ settings, name, departments, q, setQ, search, menuOpen, setMenuOpen, count, groups = [], brands = [], products = [] }) {
  const [expanded, setExpanded] = useState({});
  const [dismissed, setDismissed] = useState(false);
  const toggle = (key) => setExpanded((current) => ({ ...current, [key]: !current[key] }));
  const brandsByCategory = new Map();
  for (const product of products) {
    if (!product.category_id || !product.brand_id) continue;
    const key = JSON.stringify([product.group_id, product.category_id]);
    if (!brandsByCategory.has(key)) brandsByCategory.set(key, new Set());
    brandsByCategory.get(key).add(product.brand_id);
  }
  const logo = settings.header_logo || (name === brandName ? brandLogo : '');
  return <header className="top retail-header retail-header-v2" onKeyDown={(event) => {
    if (event.key !== 'Escape') return;
    const group = event.target.closest('.retail-nav-group');
    if (menuOpen) {
      setMenuOpen(false);
      event.currentTarget.querySelector('.mobile-menu-toggle')?.focus();
    } else if (group) {
      setDismissed(true);
      group.querySelector('a')?.focus();
    }
  }}>
    <div className="wrap">
      <button type="button" className="mobile-menu-toggle" aria-label="Toggle categories" aria-expanded={menuOpen} aria-controls="store-categories" onClick={() => setMenuOpen((open) => !open)}>
        <RetailIcon name="menu" size={22} />
      </button>
      <Link to="/" className="brand retail-brand" aria-label={`${name} home`}>
        {logo ? <img className="retail-header-logo" src={logo} alt="" /> : <>
          <img className="retail-brand-mark" src={brandIcon} alt="" width="42" height="42" />
          <span className="retail-brand-name">{name}</span>
        </>}
      </Link>
      <form className="retail-search" role="search" onSubmit={search}>
        <input type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search products, brands or models" aria-label="Search products" />
        <button type="submit" aria-label="Submit product search"><SearchIcon /></button>
      </form>
      <div className="retail-quick-actions">
        <Link to="/products?offer=1" className="retail-quick-action">
          <HeaderAction icon="gift" title="Offers" caption="Latest offers" />
        </Link>
        <Link to="/track" className="retail-quick-action">
          <HeaderAction icon="box" title="Track Order" caption="Order status" />
        </Link>
        <Link to="/account/login" className="retail-quick-action">
          <HeaderAction icon="user" title="Account" caption="Register or login" />
        </Link>
      </div>
      <Link to="/pc-builder" className="retail-builder-link">PC Builder</Link>
      <Link to="/cart" className="icon-btn retail-top-cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
        <CartIcon />{count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}
      </Link>
    </div>
    <nav id="store-categories" className={`retail-nav ${menuOpen ? 'menu-open' : ''}`} aria-label="Product categories" data-dismissed={dismissed} onPointerMove={() => dismissed && setDismissed(false)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDismissed(false); }}>
      <div className="wrap">
        <Link to="/products" className="retail-all"><RetailIcon name="menu" size={17} /> All products</Link>
        {departments.map(({ id, name, to }, index) => {
          const categories = groups.find((group) => group.id === id)?.categories || [];
          return <div className="retail-nav-group" key={to} data-open={!!expanded[to]} data-align={index >= departments.length / 2 ? 'end' : 'start'}>
            <div className="retail-nav-row"><Link to={to}>{name}</Link>
              {categories.length > 0 && <button type="button" aria-label={`Categories in ${name}`} aria-expanded={!!expanded[to]} onClick={() => toggle(to)}>⌄</button>}
            </div>
            {categories.length > 0 && <ul className="retail-categories">
              {categories.map((category) => {
                const url = `${to}&c=${encodeURIComponent(category.id)}`;
                const ids = brandsByCategory.get(JSON.stringify([id, category.id]));
                const matches = brands.filter((brand) => ids?.has(brand.id));
                return <li key={category.id} data-open={!!expanded[url]}>
                  <div className="retail-nav-row"><Link to={url}>{category.name}{matches.length > 0 && <span aria-hidden="true">›</span>}</Link>
                    {matches.length > 0 && <button type="button" aria-label={`Brands in ${category.name}`} aria-expanded={!!expanded[url]} onClick={() => toggle(url)}>⌄</button>}
                  </div>
                  {matches.length > 0 && <ul className="retail-brands">
                    {matches.map((brand) => <li key={brand.id}><Link to={`${url}&b=${encodeURIComponent(brand.id)}`}>{brand.name}</Link></li>)}
                  </ul>}
                </li>;
              })}
              <li><Link to={to}>Show all {name}</Link></li>
            </ul>}
          </div>;
        })}
      </div>
    </nav>
  </header>;
}
