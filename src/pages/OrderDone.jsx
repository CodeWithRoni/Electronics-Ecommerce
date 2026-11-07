import { Link, useParams } from 'react-router-dom';
import { useShop } from '../lib/store';
import { money, qty as fqty } from '../lib/format';

export default function OrderDone() {
  const { no } = useParams();
  const shop = useShop((s) => s.catalog.shop);
  let o = null; try { o = JSON.parse(sessionStorage.getItem(`karvio_order_${no}`)); } catch { o = null; }
  return (
    <div className="card okbox" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div className="tick" aria-hidden="true">✓</div>
      <h1>Thank you! Your order is placed.</h1>
      <div className="muted">Order number</div>
      <div className="order-no">{no}</div>
      {o && <div style={{ width: '100%', textAlign: 'left', display: 'grid', gap: 6 }}>
        {o.lines?.map((l, i) => <div className="sum-row" key={i}><span>{fqty(l.qty, l.unit)} × {l.name}</span><span>{money(l.total, shop.currency)}</span></div>)}
        <div className="sum-row"><span>Delivery</span><span>{money(o.delivery, shop.currency)}</span></div>
        <div className="sum-row total"><span>Total</span><span>{money(o.total, shop.currency)}</span></div>
      </div>}
      <p className="muted" style={{ margin: 0 }}>
        {o?.payment === 'bkash' ? 'We will check your bKash payment and call you to confirm the delivery.' : 'We will call you soon to confirm. Pay in cash when the product arrives.'}
        {shop.phone ? <> Questions? Call <a href={`tel:${shop.phone}`}>{shop.phone}</a>.</> : null}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link className="btn btn-primary" to={`/track?no=${encodeURIComponent(no)}${o?.phone ? `&phone=${o.phone}` : ''}`}>Track this order</Link>
        <Link className="btn" to="/products">Continue shopping</Link>
      </div>
    </div>
  );
}
