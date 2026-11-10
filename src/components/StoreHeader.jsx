import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RetailIcon } from './retail';
import { brandIcon, brandLogo, brandName } from '../lib/brand';
import { CartIcon, SearchIcon } from './ui';

function HeaderAction({ icon, title, caption }) {
  return <><RetailIcon name={icon} size={21} /><span><b>{title}</b><small>{caption}</small></span></>;
}

function fitDropdown(event) {
  const menu = event.currentTarget.querySelector('.retail-categories');
  if (!menu || getComputedStyle(menu).position !== 'absolute' || !menu.offsetWidth) return;

  const { left, right } = menu.getBoundingClientRect();
  const viewport = document.documentElement.clientWidth;
  const previousShift = parseFloat(menu.style.getPropertyValue('--nav-shift')) || 0;
  const shift = Math.max(8 - left + previousShift, Math.min(0, viewport - 8 - right + previousShift));
  const columnWidth = menu.firstElementChild.offsetWidth;
  menu.style.setProperty('--nav-shift', `${shift}px`);
  menu.dataset.brandsLeft = right - previousShift + shift + columnWidth > viewport - 8;
}

export default function StoreHeader({ settings, name, departments, q, setQ, search, menuOpen, setMenuOpen, count, session, logout, signingOut, groups = [], brands = [], products = [] }) {
  const [expanded, setExpanded] = useState({});
  const [dismissed, setDismissed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuToggle = useRef(null);
  const searchToggle = useRef(null);
  const searchInput = useRef(null);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 900px)');
    const closeOnDesktop = () => {
      if (!mobile.matches) {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    mobile.addEventListener('change', closeOnDesktop);
    return () => mobile.removeEventListener('change', closeOnDesktop);
  }, [setMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    root.classList.add('retail-drawer-open');
    return () => root.classList.remove('retail-drawer-open');
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  function closeMenu() {
    setMenuOpen(false);
    menuToggle.current?.focus();
  }
  const toggle = (key) => setExpanded((current) => ({ ...current, [key]: !current[key] }));
  const brandsByCategory = new Map();
  for (const product of products) {
    if (!product.category_id || !product.brand_id) continue;
    const key = JSON.stringify([product.group_id, product.category_id]);
    if (!brandsByCategory.has(key)) brandsByCategory.set(key, new Set());
    brandsByCategory.get(key).add(product.brand_id);
  }
  const logo = settings.header_logo || (name === brandName ? brandLogo : '');
  return <header className="top retail-header retail-header-v2" data-search-open={searchOpen} onKeyDown={(event) => {
    if (event.key !== 'Escape') return;
    const group = event.target.closest('.retail-nav-group');
    if (menuOpen) {
      closeMenu();
    } else if (searchOpen) {
      setSearchOpen(false);
      searchToggle.current?.focus();
    } else if (group) {
      setDismissed(true);
      group.querySelector('a')?.focus();
    }
  }}>
    <div className="wrap">
      <button ref={menuToggle} type="button" className="mobile-menu-toggle" aria-label="Toggle categories" aria-expanded={menuOpen} aria-controls="store-categories" onClick={() => {
        setSearchOpen(false);
        setMenuOpen((open) => !open);
      }}>
        <RetailIcon name={menuOpen ? 'close' : 'menu'} size={22} />
      </button>
      <Link to="/" className="brand retail-brand" aria-label={`${name} home`}>
        {logo ? <img className="retail-header-logo" src={logo} alt="" /> : <>
          <img className="retail-brand-mark" src={brandIcon} alt="" width="42" height="42" />
          <span className="retail-brand-name">{name}</span>
        </>}
      </Link>
      <button ref={searchToggle} type="button" className="retail-mobile-search-toggle" aria-label={searchOpen ? 'Close search' : 'Open search'} aria-expanded={searchOpen} aria-controls="store-search" onClick={() => {
        setMenuOpen(false);
        setSearchOpen((open) => !open);
      }}>{searchOpen ? <RetailIcon name="close" size={21} /> : <SearchIcon />}</button>
      <form id="store-search" className="retail-search" role="search" onSubmit={(event) => { search(event); setSearchOpen(false); }}>
        <input ref={searchInput} type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search products, brands or models" aria-label="Search products" />
        <button type="submit" aria-label="Submit product search"><SearchIcon /></button>
      </form>
      <div className="retail-quick-actions">
        <Link to="/products?offer=1" className="retail-quick-action">
          <HeaderAction icon="gift" title="Offers" caption="Latest offers" />
        </Link>
        <Link to="/track" className="retail-quick-action">
          <HeaderAction icon="box" title="Track Order" caption="Order status" />
        </Link>
        {session ? <div className="retail-quick-action retail-signed-in">
          <Link to="/account/profile" aria-label="My Account"><RetailIcon name="user" size={21} /></Link>
          <span><Link className="retail-account-title" to="/account/profile">Account</Link>
            <span className="retail-account-actions"><Link to="/account/profile">Profile</Link><span aria-hidden="true"> / </span>
              <button type="button" onClick={logout} disabled={signingOut}>Logout</button></span>
          </span>
        </div> : <Link to="/account/login" className="retail-quick-action">
          <HeaderAction icon="user" title="Account" caption={session === null ? 'Register or login' : ''} />
        </Link>}
      </div>
      <Link to="/pc-builder" className="retail-builder-link">PC Builder</Link>
      <Link to="/cart" className="icon-btn retail-top-cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
        <CartIcon /><span className="cart-count" data-empty={count === 0} aria-hidden="true">{count > 99 ? '99+' : count}</span>
      </Link>
    </div>
    {menuOpen && <button type="button" className="retail-drawer-backdrop" aria-label="Close categories" tabIndex={-1} onClick={closeMenu} />}
    <nav id="store-categories" className={`retail-nav ${menuOpen ? 'menu-open' : ''}`} aria-label="Product categories" data-dismissed={dismissed} onPointerMove={() => dismissed && setDismissed(false)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDismissed(false); }}>
      <div className="wrap">
        <Link to="/products" className="retail-all"><RetailIcon name="menu" size={17} /> All products</Link>
        {departments.map(({ id, name, to }, index) => {
          const categories = groups.find((group) => group.id === id)?.categories || [];
          const menuItems = categories.length + 1;
          const columns = menuItems > 16 ? 2 : 1;
          return <div className="retail-nav-group" key={to} data-open={!!expanded[to]} data-align={index >= departments.length / 2 ? 'end' : 'start'} onPointerEnter={fitDropdown} onFocus={fitDropdown}>
            <div className="retail-nav-row"><Link to={to}><span className="retail-nav-label" title={name}>{name}</span></Link>
              {categories.length > 0 && <button type="button" aria-label={`Categories in ${name}`} aria-expanded={!!expanded[to]} onClick={() => toggle(to)}>{expanded[to] ? '−' : '+'}</button>}
            </div>
            {categories.length > 0 && <ul className="retail-categories" style={{ '--nav-columns': columns, '--nav-rows': Math.ceil(menuItems / columns) }}>
              {categories.map((category) => {
                const url = `${to}&c=${encodeURIComponent(category.id)}`;
                const ids = brandsByCategory.get(JSON.stringify([id, category.id]));
                const matches = brands.filter((brand) => ids?.has(brand.id));
                return <li key={category.id} data-open={!!expanded[url]}>
                  <div className="retail-nav-row"><Link to={url}><span className="retail-nav-label" title={category.name}>{category.name}</span>{matches.length > 0 && <span aria-hidden="true">›</span>}</Link>
                    {matches.length > 0 && <button type="button" aria-label={`Brands in ${category.name}`} aria-expanded={!!expanded[url]} onClick={() => toggle(url)}>{expanded[url] ? '−' : '+'}</button>}
                  </div>
                  {matches.length > 0 && <ul className="retail-brands">
                    {matches.map((brand) => <li key={brand.id}><Link to={`${url}&b=${encodeURIComponent(brand.id)}`}><span className="retail-nav-label" title={brand.name}>{brand.name}</span></Link></li>)}
                  </ul>}
                </li>;
              })}
              <li><Link to={to}><span className="retail-nav-label" title={`Show all ${name}`}>Show all {name}</span></Link></li>
            </ul>}
          </div>;
        })}
      </div>
    </nav>
  </header>;
}


const mobileShortcuts = [
  { to: '/products?offer=1', label: 'Offers', icon: 'gift' },
  { to: '/track', label: 'Track Order', icon: 'box' },
  { to: '/pc-builder', label: 'PC Builder', icon: 'desktop' },
  { to: '/wishlist', label: 'Wishlist', icon: 'heart' },
];

export function MobileShopNav({ session }) {
  const { pathname, search } = useLocation();
  const account = { to: session ? '/account/profile' : '/account/login', label: session ? 'Profile' : 'Account', icon: 'user' };
  return <nav className="retail-mobile-nav" aria-label="Shopping navigation">
    {[...mobileShortcuts, account].map(({ to, label, icon }) => <Link key={to} to={to} aria-current={(pathname + search === to || (to === account.to && session && pathname.startsWith('/account/profile/'))) ? 'page' : undefined}>
      <RetailIcon name={icon} size={20} /><span>{label}</span>
    </Link>)}
  </nav>;
}
