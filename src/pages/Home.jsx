import { Link } from 'react-router-dom';
import { useShop } from '../lib/store';
import { money } from '../lib/format';
import { ProductCard, Empty } from '../components/ui';

export default function Home() {
  const catalog = useShop((s) => s.catalog);
  const { shop, products, groups, brands } = catalog;
  const brandName = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  const fresh = [...products].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).filter((p) => p.in_stock).slice(0, 8);
  return (
    <>
      <section className="hero">
        <h1>{shop.name}</h1>
        <p>Computer, IT and networking products with real warranty. Order online and get it delivered — prices and stock come straight from our shop.</p>
        <div className="hero-points">
          {shop.cod && <span>Cash on delivery</span>}
          {shop.bkash.enabled && <span>bKash payment</span>}
          <span>Delivery {money(shop.delivery.inside, shop.currency)} {shop.delivery.inside_label}</span>
          <span>Official warranty</span>
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <Link to="/products" className="btn btn-primary btn-lg">Browse all products</Link>
          <Link to="/track" className="btn btn-lg btn-ghost">Track an order</Link>
        </div>
      </section>
      {groups.length > 0 && <nav className="chips" aria-label="Product groups">
        {groups.map((g) => <Link key={g.id} className="chip" to={`/products?g=${g.id}`}>{g.name}</Link>)}
      </nav>}
      <div className="section-head"><h2>New arrivals</h2><Link className="link" to="/products">See all {products.length}</Link></div>
      {fresh.length ? <div className="grid">{fresh.map((p) => <ProductCard key={p.id} p={p} brand={brandName[p.brand_id]} currency={shop.currency} />)}</div>
        : <Empty title="Products are coming soon">Please check back later or call the shop.</Empty>}
    </>
  );
}
