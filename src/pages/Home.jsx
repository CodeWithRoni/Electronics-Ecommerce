import { Link } from 'react-router-dom';
import { useShop } from '../lib/store';
import { ProductCard, Empty } from '../components/ui';
import { RetailIcon, shopDepartments } from '../components/retail';
import heroArt from '../assets/retail-hero.svg';

export default function Home() {
  const { shop, products, groups, brands, settings } = useShop((s) => s.catalog);
  const brandName = Object.fromEntries(brands.map((brand) => [brand.id, brand.name]));
  const featured = [...products].sort((a, b) =>
    Number(b.in_stock) - Number(a.in_stock) ||
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  ).slice(0, 10);
  const payments = [shop.cod && 'Cash on delivery', shop.bkash?.enabled && 'bKash'].filter(Boolean);
  const departments = shopDepartments(groups, !settings);
  const banner = settings || {};
  const buttonText = banner.banner_button || 'Shop all products';
  const bannerLink = banner.banner_link || '#/products';
  const buttonContent = <>{buttonText} <span aria-hidden="true">→</span></>;

  return (
    <div className="retail-home">
      <div className="retail-masthead">
        <section className="retail-hero" aria-labelledby="home-title">
          <div className="retail-hero-copy">
            <span className="retail-kicker">COMPUTERS & ELECTRONICS</span>
            <h1 id="home-title">{banner.banner_title || <>Tech for every<br className="desktop-break" /> setup<span>.</span></>}</h1>
            <p>{banner.banner_text || 'Explore computer parts, networking gear and everyday accessories in one place.'}</p>
            {bannerLink.startsWith('#/') ? <Link className="btn btn-primary" to={bannerLink.slice(1)}>{buttonContent}</Link>
              : <a className="btn btn-primary" href={bannerLink}>{buttonContent}</a>}
          </div>
          <img className={`retail-hero-art ${banner.banner_image ? "retail-custom-art" : ""}`} src={banner.banner_image || heroArt} alt="" fetchPriority="high" />
        </section>

        <aside className="retail-shortcuts" aria-label="Shopping shortcuts">
          <Link className="retail-shortcut retail-shortcut-stock" to="/products?stock=1">
            <RetailIcon name="bolt" />
            <div><strong>Ready to order</strong><span>Shop in-stock products</span></div>
            <span aria-hidden="true">↗︎</span>
          </Link>
          <Link className="retail-shortcut retail-shortcut-track" to="/track">
            <RetailIcon name="box" />
            <div><strong>Track your order</strong><span>Check your order status</span></div>
            <span aria-hidden="true">↗︎</span>
          </Link>
        </aside>
      </div>

      <section className="retail-services" aria-label="Shopping information">
        <div><RetailIcon name="truck" /><span><strong>Delivery options</strong><small>See rates at checkout</small></span></div>
        <div><RetailIcon name="wallet" /><span><strong>Payment options</strong><small>{payments.join(' · ') || 'See options at checkout'}</small></span></div>
        <Link to="/wishlist"><RetailIcon name="heart" /><span><strong>Your wishlist</strong><small>Save products for later</small></span></Link>
        <Link className="retail-service-mobile" to="/pc-builder"><RetailIcon name="desktop" /><span><strong>PC Builder</strong><small>Build your own PC</small></span></Link>
      </section>

      {departments.length > 0 && <section className="retail-section" aria-labelledby="department-title">
        <div className="retail-section-heading">
          <h2 id="department-title">Shop by category</h2>
          <p>Browse computers, components, peripherals and more.</p>
        </div>
        <nav className="retail-departments" aria-label="Shop by category">
          {departments.map(({ name, to, icon }) => (
            <Link key={to} to={to}>
              <span className="retail-department-icon"><RetailIcon name={icon} size={32} /></span>
              <span>{name}</span>
            </Link>
          ))}
        </nav>
      </section>}

      <section className="retail-section" aria-labelledby="featured-title">
        <div className="retail-section-heading">
          <h2 id="featured-title">Featured products</h2>
          <p>Browse the latest products in our catalog.</p>
          <Link to="/products" className="retail-section-link">View all products <span aria-hidden="true">→</span></Link>
        </div>
        {featured.length ? (
          <div className="grid retail-product-grid">
            {featured.map((p) => <ProductCard key={p.id} p={p} brand={brandName[p.brand_id]} currency={shop.currency} />)}
          </div>
        ) : (
          <Empty title="Products are coming soon"><p className="muted">Check back for new arrivals.</p></Empty>
        )}
      </section>
    </div>
  );
}
