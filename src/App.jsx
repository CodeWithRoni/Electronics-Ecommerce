import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useShop } from './lib/store';
import { SearchIcon, CartIcon, ThemeIcon, Spinner } from './components/ui';
import { RetailIcon, shopDepartments } from './components/retail';
import Home from './pages/Home';
import Products from './pages/Products';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderDone from './pages/OrderDone';
import Track from './pages/Track';
import Wishlist from './pages/Wishlist';
import {useFavorites} from './lib/favorites';
import './styles-startech.css';
import './styles-retail.css';

export default function App() {
  return <HashRouter><Shell /></HashRouter>;
}

function Shell() {
  const { catalog, error, load, theme, toggleTheme, cart, toasts } = useShop();
  const favoriteCount=useFavorites(s=>s.ids.length);
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { load(); }, [load]);
  // fresh prices and stock when the visitor comes back to the tab
  useEffect(() => {
    const again = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', again);
    return () => document.removeEventListener('visibilitychange', again);
  }, [load]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    setMenuOpen(false);
    setQ(new URLSearchParams(location.search).get('q') || '');
  }, [location.key, location.search]);
  useEffect(() => { if (catalog?.shop?.name) document.title = `${catalog.shop.name} — Online Shop`; }, [catalog?.shop?.name]);

  const shop = catalog?.shop;
  const shopName = shop?.name || 'Electronics E-commerce';
  const departments = shopDepartments(catalog?.groups);
  const count = cart.reduce((n, l) => n + (Number.isInteger(l.qty) ? l.qty : 1), 0);
  const search = (e) => { e.preventDefault(); navigate(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <div className="retail-shell">
      {shop?.notice && shop.open && <div className="notice" role="note">{shop.notice}</div>}
      <div className="retail-utility"><div className="wrap">
        <span>Computers, components & IT accessories</span>
        <Link to="/track">Track order <span aria-hidden="true">↗︎</span></Link>
      </div></div>
      <header className="top retail-header" onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          event.currentTarget.querySelector('.mobile-menu-toggle')?.focus();
        }
      }}>
        <div className="wrap">
          <button type="button" className="mobile-menu-toggle" aria-label="Toggle categories" aria-expanded={menuOpen} aria-controls="store-categories" onClick={() => setMenuOpen((open) => !open)}>
            <RetailIcon name="menu" size={22} />
          </button>
          <Link to="/" className="brand retail-brand" aria-label={`${shopName} home`}>
            <span className="retail-brand-mark"><RetailIcon name="bolt" size={24} /></span>
            <span className="retail-brand-name">{shopName}</span>
          </Link>
          <form className="retail-search" role="search" onSubmit={search}>
            <input type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search products, brands or models" aria-label="Search products" />
            <button type="submit" aria-label="Submit product search"><SearchIcon /><span>Search</span></button>
          </form>
          <div className="retail-header-actions">
            <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist, ${favoriteCount} saved`}><RetailIcon name="heart" size={21} />{favoriteCount > 0 && <span className="cart-count">{favoriteCount}</span>}</Link>
            <button type="button" className="icon-btn retail-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}><ThemeIcon dark={theme === 'dark'} /></button>
            <Link to="/cart" className="icon-btn" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <CartIcon />{count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}
            </Link>
          </div>
        </div>
        <nav id="store-categories" className={`retail-nav ${menuOpen ? 'menu-open' : ''}`} aria-label="Product categories">
          <div className="wrap">
            <Link to="/products" className="retail-all"><RetailIcon name="menu" size={17} /> All products</Link>
            {departments.map(({ name, to }) => <Link key={to} to={to}>{name}</Link>)}
            <Link to="/track" className="retail-nav-track">Track order</Link>
          </div>
        </nav>
      </header>
      <main>
        <div className="wrap">
          {!catalog ? (error ? <div className="closed"><b>The shop could not be loaded</b><p className="muted">{error}</p><button type="button" className="btn btn-primary" onClick={load}>Try again</button></div> : <Spinner label="Loading the shop" />)
            : !shop.open ? <Closed shop={shop} />
            : (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/p/:id" element={<Product />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/done/:no" element={<OrderDone />} />
                <Route path="/track" element={<Track />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="*" element={<div className="closed"><b>Page not found</b><Link className="btn" to="/">Go to the shop</Link></div>} />
              </Routes>
            )}
          {catalog && !shop.open && location.pathname === '/track' && <Track />}
        </div>
      </main>
      <footer>
        <div className="wrap">
          <div><h3>{shopName}</h3><p>Computers, networking and IT accessories.</p>{shop?.address && <p>{shop.address}</p>}</div>
          <div><h3>Shop</h3><p><Link to="/products">All products</Link></p><p><Link to="/wishlist">Wishlist</Link></p></div>
          {(shop?.phone || shop?.tel || shop?.email) && <div><h3>Contact</h3>
            {shop.phone && <p>Mobile: <a href={`tel:${shop.phone}`}>{shop.phone}</a></p>}
            {shop.tel && <p>Tel: <a href={`tel:${shop.tel}`}>{shop.tel}</a></p>}
            {shop.email && <p>Email: <a href={`mailto:${shop.email}`}>{shop.email}</a></p>}
          </div>}
          <div><h3>Orders</h3><p><Link to="/track">Track your order</Link></p><p>{[shop?.cod && 'Cash on delivery', shop?.bkash?.enabled && 'bKash'].filter(Boolean).join(' · ')}</p></div>
        </div>
        <p className="powered">Electronics E-commerce · Independent Store</p>
      </footer>
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`toast ${t.kind === 'err' ? 'err' : ''}`}>{t.msg}</div>)}</div>
    </div>
  );
}

function Closed({ shop }) {
  return (
    <div className="closed">
      <h1>{shop.name}</h1>
      <p className="muted">Online orders are closed right now.{shop.phone ? <> Please call <a href={`tel:${shop.phone}`}>{shop.phone}</a>.</> : null}</p>
      <Link to="/track" className="link">Track an order you already placed</Link>
    </div>
  );
}
