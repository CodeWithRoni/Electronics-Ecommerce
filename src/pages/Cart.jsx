import { Link, useNavigate } from 'react-router-dom';
import { useShop, cartLines } from '../lib/store';
import { money } from '../lib/format';
import { Photo, Stepper, Empty } from '../components/ui';

export default function Cart() {
  const { catalog, cart, setQty, remove } = useShop();
  const navigate = useNavigate();
  const { shop } = catalog;
  const lines = cartLines(cart, catalog);
  if (!lines.length) return <Empty title="Your cart is empty"><Link className="btn btn-primary" to="/products">Start shopping</Link></Empty>;
  const ok = lines.filter((l) => l.product && l.product.in_stock);
  const subtotal = ok.reduce((s, l) => s + l.qty * l.product.price, 0);
  const blocked = lines.some((l) => !l.product || !l.product.in_stock);
  return (
    <>
      <div className="page-title"><h1>Cart</h1><Link className="link" to="/products">Continue shopping</Link></div>
      <div className="two-col">
        <div className="card">
          {lines.map((l) => {
            const p = l.product;
            return (
              <div className="cline" key={l.product_id}>
                <Photo product={p || { name: '?' }} width={200} />
                <div>
                  {p ? <Link className="cline-name" to={`/p/${p.id}`}>{p.name}</Link> : <b>No longer available</b>}
                  {p && <div className="cline-meta">{money(p.price, shop.currency)}{p.decimal ? ` / ${p.unit}` : ''}</div>}
                  {(!p || !p.in_stock) && <div className="warnline">{p ? 'Out of stock — remove it to order' : 'Remove this item to order'}</div>}
                </div>
                <div className="cline-right">
                  {p && p.in_stock ? <Stepper small value={l.qty} min={p.decimal ? 0.5 : 1} step={p.decimal ? 0.5 : 1} max={p.decimal ? 1000 : 50} onChange={(v) => setQty(l.product_id, v)} label={`Quantity of ${p.name}`} /> : <span />}
                  <span><b>{p ? money(l.qty * p.price, shop.currency) : ''}</b> <button type="button" className="link" onClick={() => remove(l.product_id)} aria-label={`Remove ${p ? p.name : 'item'}`}>Remove</button></span>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="card summary">
          <h2>Order summary</h2>
          <div className="sum-row"><span>Items ({ok.length})</span><b>{money(subtotal, shop.currency)}</b></div>
          <div className="sum-row muted"><span>Delivery</span><span>from {money(shop.delivery.inside, shop.currency)}</span></div>
          <div className="sum-row total"><span>Total</span><span>{money(subtotal, shop.currency)}+</span></div>
          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={blocked || !ok.length} onClick={() => navigate('/checkout')}>Checkout</button>
          {blocked && <small className="muted">Remove the items that are not available to continue.</small>}
          <small className="muted">Prices and stock are checked again when you place the order.</small>
        </aside>
      </div>
    </>
  );
}
