import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { RetailIcon } from './retail';
import { brandIcon, brandLogo, brandName } from '../lib/brand';
import { CartIcon, SearchIcon, ThemeIcon } from './ui';

function HeaderAction({ icon, title, caption }) {
  return <><RetailIcon name={icon} size={21} /><span><b>{title}</b><small>{caption}</small></span></>;
}

export default function StoreHeader({ settings, name, departments, q, setQ, search, menuOpen, setMenuOpen, count, favoriteCount, theme, toggleTheme }) {
  const account = useRef(null);
  const closeAccount = () => { if (account.current) account.current.open = false; };
  const logo = settings.header_logo || (name === brandName ? brandLogo : '');
  return <header className="top retail-header retail-header-v2" onKeyDown={(event) => {
    if (event.key !== 'Escape') return;
    if (account.current?.open) {
      closeAccount();
      account.current.querySelector('summary')?.focus();
    } else if (menuOpen) {
      setMenuOpen(false);
      event.currentTarget.querySelector('.mobile-menu-toggle')?.focus();
    }
  }}>
    <div className="wrap">
      <button type="button" className="mobile-menu-toggle" aria-label="Toggle categories" aria-expanded={menuOpen} aria-controls="store-categories" onClick={() => setMenuOpen((open) => !open)}>
        <RetailIcon name="menu" size={22} />
      </button>
      <Link to="/" className="brand retail-brand" aria-label={`${name} home`} onClick={closeAccount}>
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
        <Link to="/products?offer=1" className="retail-quick-action" onClick={closeAccount}>
          <HeaderAction icon="gift" title="Offers" caption="Latest offers" />
        </Link>
        <Link to="/track" className="retail-quick-action" onClick={closeAccount}>
          <HeaderAction icon="box" title="Track Order" caption="Order status" />
        </Link>
        <details ref={account} className="retail-account">
          <summary className="retail-quick-action"><HeaderAction icon="user" title="Account" caption="Orders & wishlist" /></summary>
          <div className="retail-account-menu">
            <Link to="/track" onClick={closeAccount}>Track your order</Link>
            <Link to="/wishlist" aria-label={`Wishlist, ${favoriteCount} saved`} onClick={closeAccount}>Wishlist <small>{favoriteCount} saved</small></Link>
            <button type="button" onClick={toggleTheme}><ThemeIcon dark={theme === 'dark'} /> {theme === 'dark' ? 'Light theme' : 'Dark theme'}</button>
          </div>
        </details>
      </div>
      <Link to="/pc-builder" className="retail-builder-link" onClick={closeAccount}>PC Builder</Link>
      <Link to="/cart" className="icon-btn retail-top-cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`} onClick={closeAccount}>
        <CartIcon />{count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}
      </Link>
    </div>
    <nav id="store-categories" className={`retail-nav ${menuOpen ? 'menu-open' : ''}`} aria-label="Product categories">
      <div className="wrap">
        <Link to="/products" className="retail-all"><RetailIcon name="menu" size={17} /> All products</Link>
        {departments.map(({ name, to }) => <Link key={to} to={to}>{name}</Link>)}
      </div>
    </nav>
  </header>;
}
