import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useShop } from './lib/store';
import { brandName } from './lib/brand';
import { Spinner } from './components/ui';
import { shopDepartments } from './components/retail';
import StoreHeader, { MobileShopNav } from './components/StoreHeader';
import Home from './pages/Home';
import PcBuilder from './pages/PcBuilder';
import AccountDashboard from './pages/AccountDashboard';
import { customerAuth } from './lib/customerAuth';
import Account, { AccountCallback } from './pages/Account';
import StoreFooter from './components/StoreFooter';
import Products from './pages/Products';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderDone from './pages/OrderDone';
import Track from './pages/Track';
import Wishlist from './pages/Wishlist';
import './styles-startech.css';
import './styles-retail.css';

export default function App() {
  return <HashRouter><Shell /></HashRouter>;
}

function Shell() {
  const { catalog, error, load, theme, toggleTheme, cart, toasts, toast } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState(undefined);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    const { data: { subscription } } = customerAuth.onAuthStateChange((_event, current) => setSession(current));
    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    setSigningOut(true);
    try {
      const { error } = await customerAuth.signOut({ scope: 'local' });
      if (error) throw error;
      navigate('/account/login', { replace: true });
    } catch (issue) {
      toast(issue.message || 'Could not log out. Try again.', 'err');
    } finally {
      setSigningOut(false);
    }
  }

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

  const settings = catalog?.settings || {};
  useEffect(() => {
    if (!settings.favicon) return;
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.href = settings.favicon;
    document.head.append(icon);
    return () => icon.remove();
  }, [settings.favicon]);

  const shop = catalog?.shop;
  const shopName = shop?.name || brandName;
  const departments = shopDepartments(catalog?.groups, !catalog?.settings);
  const count = cart.reduce((n, l) => n + (Number.isInteger(l.qty) ? l.qty : 1), 0);
  const search = (e) => { e.preventDefault(); navigate(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <div className="retail-shell">
      {shop?.notice && shop.open && <div className="notice" role="note">{shop.notice}</div>}
      <AccountCallback />
      <StoreHeader key={location.key} settings={settings} name={shopName} departments={departments} q={q} setQ={setQ} search={search}
        session={session} logout={logout} signingOut={signingOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen} count={count} groups={catalog?.groups} brands={catalog?.brands} products={catalog?.products} />
      <main>
        <div className="wrap">
          {!catalog ? (error ? <div className="closed"><b>The shop could not be loaded</b><p className="muted">{error}</p><button type="button" className="btn btn-primary" onClick={load}>Try again</button></div> : <Spinner label="Loading the shop" />)
            : !shop.open ? <Closed shop={shop} />
            : (
              <Routes>
                <Route path="/" element={<Home />} />
                {['login', 'register', 'check-email', 'forgot', 'reset', 'privacy'].map((page) => <Route key={page} path={`/account/${page}`} element={<Account key={page} page={page} shop={shop} settings={settings} session={session} />} />)}
                <Route path="/account/profile/:section?" element={<AccountDashboard key={session?.user.id} session={session} logout={logout} signingOut={signingOut} theme={theme} toggleTheme={toggleTheme} />} />
                <Route path="/pc-builder" element={session === undefined ? <Spinner label="Loading PC Builder" /> : <PcBuilder key={session?.user.id} session={session} />} />
                <Route path="/products" element={<Products />} />
                <Route path="/p/:id" element={<Product />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={session === undefined ? <Spinner label="Loading checkout" /> : <Checkout key={session?.user.id} session={session} />} />
                <Route path="/done/:no" element={<OrderDone />} />
                <Route path="/track" element={<Track />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="*" element={<div className="closed"><b>Page not found</b><Link className="btn" to="/">Go to the shop</Link></div>} />
              </Routes>
            )}
          {catalog && !shop.open && location.pathname === '/track' && <Track />}
        </div>
      </main>
      <StoreFooter settings={settings} shop={shop} />
      <MobileShopNav session={session} />
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
