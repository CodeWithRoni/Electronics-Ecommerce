import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../lib/store';
import { money, warrantyText } from '../lib/format';
import { Photo, StockBadge, Stepper, Empty, ProductCard } from '../components/ui';

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { catalog, add } = useShop();
  const { shop, products, groups, brands } = catalog;
  const p = products.find((x) => x.id === id);
  const [pic, setPic] = useState(0);
  const [n, setN] = useState(1);
  if (!p) return <Empty title="This product is not available"><Link className="btn" to="/products">See all products</Link></Empty>;
  const brand = brands.find((b) => b.id === p.brand_id)?.name;
  const group = groups.find((g) => g.id === p.group_id), cat = group?.categories.find((c) => c.id === p.category_id);
  const images = (p.images || []).length ? p.images : [null];
  const details = [['Brand',brand],['Model',p.sku],['Category',cat?.name || group?.name],['Warranty',p.warranty_days > 0 ? warrantyText(p.warranty_days) : null],['Availability',p.in_stock ? 'In stock' : 'Out of stock']].filter(([,value])=>value);
  const related = products.filter((x) => x.id !== p.id && x.in_stock && (x.category_id ? x.category_id === p.category_id : x.group_id === p.group_id)).slice(0, 4);
  const step = p.decimal ? 0.5 : 1;

  return (
    <>
      <div className="crumbs"><Link to="/products">Products</Link>{group && <> › <Link to={`/products?g=${group.id}`}>{group.name}</Link></>}{cat && <> › <Link to={`/products?g=${group.id}&c=${cat.id}`}>{cat.name}</Link></>}</div>
      <div className="pdp">
        <div className="gallery">
          <Photo product={p} id={images[pic] || undefined} width={1000} alt={`${p.name}${images.length > 1 ? ` — picture ${pic + 1}` : ''}`} />
          {images.length > 1 && <div className="thumbs">{images.map((img, i) => <button type="button" key={img} className={i === pic ? 'on' : ''} onClick={() => setPic(i)} aria-label={`Picture ${i + 1}`}><Photo product={p} id={img} width={160} alt="" /></button>)}</div>}
        </div>
        <div className="pdp-info">
          {brand && <span className="pcard-brand">{brand}</span>}
          <h1>{p.name}</h1>
          <div className="buy"><span className="price">{money(p.price, shop.currency)}{p.decimal ? <small className="muted"> / {p.unit}</small> : null}</span><StockBadge p={p} /></div>
          <div className="facts">
            {p.sku && <span>Model: {p.sku}</span>}
            {p.warranty_days > 0 && <span>{warrantyText(p.warranty_days)}</span>}
            {cat && <span>{cat.name}</span>}
          </div>
          {p.in_stock ? (
            <div className="buy">
              <Stepper value={n} onChange={setN} min={step} step={step} max={p.decimal ? 1000 : 50} label={`Quantity${p.decimal ? ` (${p.unit})` : ''}`} />
              <button type="button" className="btn btn-primary btn-lg" onClick={() => add(p, n)}>Add to cart</button>
              <button type="button" className="btn btn-lg" onClick={() => { add(p, n); navigate('/cart'); }}>Buy now</button>
            </div>
          ) : <p className="muted">Out of stock right now.{shop.phone ? <> Call <a href={`tel:${shop.phone}`}>{shop.phone}</a> to ask when it is back.</> : null}</p>}
          {p.description && <div className="card"><h3 style={{ marginBottom: 6 }}>About this product</h3><div className="desc">{p.description}</div></div>}
          <div className="assure">
            {shop.cod && <div><b>Cash on delivery</b>Pay when you receive it</div>}
            {shop.bkash.enabled && <div><b>bKash</b>Pay before delivery</div>}
            <div><b>Delivery</b>{money(shop.delivery.inside, shop.currency)} {shop.delivery.inside_label}, {money(shop.delivery.outside, shop.currency)} elsewhere</div>
          </div>
        </div>
      </div>
      <section className="product-detail-section" aria-label="Product information"><div className="section-head"><h2>Product details</h2></div><div className="product-detail-grid"><div className="card"><h3>Key specifications</h3><dl className="specification-list">{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><div className="card"><h3>Description</h3><div className="desc">{p.description || "More product information will be available soon."}</div></div></div></section>
      {related.length > 0 && <>
        <div className="section-head"><h2>You may also like</h2></div>
        <div className="grid">{related.map((x) => <ProductCard key={x.id} p={x} brand={brands.find((b) => b.id === x.brand_id)?.name} currency={shop.currency} />)}</div>
      </>}
    </>
  );
}
