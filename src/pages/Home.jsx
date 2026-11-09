import { Link } from 'react-router-dom';
import { useShop } from '../lib/store';
import { ProductCard, Empty } from '../components/ui';
const categories=[['Laptop','💻'],['Desktop','🖥️'],['Monitor','📺'],['Networking','📡'],['Accessories','⌨️'],['Components','⚙️'],['Storage','💾'],['Security','📷']];
export default function Home(){
 const {shop,products,groups,brands}=useShop(s=>s.catalog);
 const brandName=Object.fromEntries(brands.map(b=>[b.id,b.name]));
 const fresh=[...products].sort((a,b)=>a.created_at<b.created_at?1:-1).slice(0,12);
 return <div className="store-home">
  <section className="store-hero"><div className="hero-main"><span className="eyebrow">YOUR TECH DESTINATION</span><h1>Upgrade your world with better technology.</h1><p>Discover computers, accessories, components and networking essentials—all in one convenient store.</p><div className="hero-actions"><Link className="btn btn-primary btn-lg" to="/products">Shop all products →</Link><Link className="btn btn-ghost btn-lg" to="/track">Track your order</Link></div><div className="hero-trust"><span>✓ Secure checkout</span><span>✓ Order tracking</span><span>✓ Local support</span></div></div><div className="hero-visual" aria-hidden="true"><div className="tech-orbit orbit-a"></div><div className="tech-orbit orbit-b"></div><div className="tech-display">⌘</div><span className="tech-pill pill-a">PERFORMANCE</span><span className="tech-pill pill-b">TECH ESSENTIALS</span></div></section>
  <section className="service-strip"><div><strong>🚚 Delivery options</strong><small>See rates at checkout</small></div><div><strong>🛡️ Trusted shopping</strong><small>Clear product details</small></div><div><strong>💳 Flexible payment</strong><small>{shop.cod?'Cash on delivery':'Contact for payment'}{shop.bkash.enabled?' · bKash':''}</small></div><div><strong>📦 Track orders</strong><small>Follow your purchase</small></div></section>
  <div className="section-head"><div><span className="eyebrow">FIND WHAT YOU NEED</span><h2>Shop by category</h2></div><Link to="/products" className="link">All categories →</Link></div>
  <nav className="category-grid" aria-label="Shop categories">{(groups.length?groups.map((g,i)=>[g.name,categories[i%categories.length][1],g.id]):categories.map(([n,icon])=>[n,icon,n])).map(([name,icon,id])=><Link key={id} to={'/products?g='+encodeURIComponent(id)} className="category-tile"><span>{icon}</span><b>{name}</b><small>Explore →</small></Link>)}</nav>
  <section className="promo-band"><div><span className="eyebrow">EXPLORE THE COLLECTION</span><h2>Everything for your perfect setup</h2><p>Browse components, peripherals and everyday tech.</p></div><Link to="/products" className="btn btn-primary">Explore products →</Link></section>
  <div className="section-head"><div><span className="eyebrow">JUST ADDED</span><h2>Latest products</h2></div><Link to="/products" className="link">View all {products.length} →</Link></div>
  {fresh.length?<div className="grid">{fresh.map(p=><ProductCard key={p.id} p={p} brand={brandName[p.brand_id]} currency={shop.currency}/>)}</div>:<Empty title="Products are coming soon">Our catalog is being prepared. Please check back soon.</Empty>}
  <section className="bottom-promo"><div><span className="eyebrow">NEED HELP?</span><h2>Find the right product for your needs.</h2><p>Browse our selection or reach out to the store for assistance.</p></div><Link to="/products" className="btn btn-primary">Start shopping</Link></section>
 </div>;
}
