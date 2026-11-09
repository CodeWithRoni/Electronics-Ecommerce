import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop, cartLines } from '../lib/store';
import { api, newRef } from '../lib/api';
import { money, qty as fqty, bdPhone } from '../lib/format';
import { Empty } from '../components/ui';

const SAVED = 'electronics_shop_customer'; // name / phone / address remembered on this device for the next order
const readSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED)) || {}; } catch { return {}; } };

export default function Checkout() {
  const { catalog, cart, clearCart, load } = useShop();
  const navigate = useNavigate();
  const { shop } = catalog;
  const saved = readSaved();
  const [f, setF] = useState({ name: saved.name || '', phone: saved.phone || '', address: saved.address || '', area: saved.area || 'inside', note: '', payment: shop.cod ? 'cod' : 'bkash', bkash_sender: '', bkash_trx: '', company: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const ref = useRef(newRef()); // the same order is never placed twice, even if "Place order" is pressed again after a network error

  const lines = cartLines(cart, catalog).filter((l) => l.product && l.product.in_stock);
  if (!lines.length) return <Empty title="Your cart is empty"><Link className="btn btn-primary" to="/products">Start shopping</Link></Empty>;
  const subtotal = Math.round(lines.reduce((s, l) => s + l.qty * l.product.price, 0) * 100) / 100;
  const delivery = f.area === 'outside' ? shop.delivery.outside : shop.delivery.inside;
  const total = subtotal + delivery;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }); };
  const pick = (k, v) => () => setF({ ...f, [k]: v });

  const check = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Please write your name';
    if (!bdPhone(f.phone)) e.phone = 'Write a valid mobile number, e.g. 017XXXXXXXX';
    if (f.address.trim().length < 8) e.address = 'Write the full address (house, road, area, district)';
    if (f.payment === 'bkash') {
      if (!bdPhone(f.bkash_sender)) e.bkash_sender = 'The bKash number you paid from';
      if (!/^[A-Za-z0-9]{8,12}$/.test(f.bkash_trx.trim())) e.bkash_trx = 'The TrxID from the bKash message, e.g. 9AB3CD4EF5';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    setFail('');
    if (!check()) return;
    setBusy(true);
    try {
      const r = await api('shop.order.create', {
        name: f.name, phone: f.phone, address: f.address, area: f.area, note: f.note, payment: f.payment,
        bkash_sender: f.payment === 'bkash' ? f.bkash_sender : '', bkash_trx: f.payment === 'bkash' ? f.bkash_trx.trim() : '',
        company: f.company, client_ref: ref.current,
        items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty }))
      });
      try { localStorage.setItem(SAVED, JSON.stringify({ name: f.name.trim(), phone: bdPhone(f.phone), address: f.address.trim(), area: f.area })); } catch { /* private mode */ }
      try { sessionStorage.setItem(`electronics_order_${r.order_no}`, JSON.stringify({ ...r, phone: bdPhone(f.phone), lines: lines.map((l) => ({ name: l.product.name, qty: l.qty, unit: l.product.unit, total: l.qty * l.product.price })) })); } catch { /* fine */ }
      clearCart();
      load();
      navigate(`/done/${r.order_no}`, { replace: true });
    } catch (e) {
      setFail(e.message);
      if (/no longer sold|out of stock|left|refresh/i.test(e.message)) load();
    } finally { setBusy(false); }
  };

  const Err = ({ k }) => (errors[k] ? <small className="err" role="alert">{errors[k]}</small> : null);
  return (
    <form onSubmit={submit} noValidate>
      <div className="page-title"><h1>Checkout</h1><Link className="link" to="/cart">Back to cart</Link></div>
      <div className="two-col">
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <h2 style={{ marginBottom: 14 }}>Delivery details</h2>
            <div className="form-grid">
              <label className="field"><span>Your name</span><input value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} /><Err k="name" /></label>
              <label className="field"><span>Mobile number</span><input value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" aria-invalid={!!errors.phone} /><Err k="phone" /></label>
              <label className="field wide"><span>Full address</span><textarea value={f.address} onChange={set('address')} autoComplete="street-address" placeholder="House, road, area, thana, district" aria-invalid={!!errors.address} /><Err k="address" /></label>
              <div className="field wide"><span>Delivery area</span>
                <div className="choices">
                  <label className={`choice ${f.area === 'inside' ? 'on' : ''}`}><input type="radio" name="area" checked={f.area === 'inside'} onChange={pick('area', 'inside')} /><span><b>{shop.delivery.inside_label}</b><small>Delivery {money(shop.delivery.inside, shop.currency)}</small></span></label>
                  <label className={`choice ${f.area === 'outside' ? 'on' : ''}`}><input type="radio" name="area" checked={f.area === 'outside'} onChange={pick('area', 'outside')} /><span><b>Everywhere else</b><small>Delivery {money(shop.delivery.outside, shop.currency)}</small></span></label>
                </div>
              </div>
              <label className="field wide"><span>Note (optional)</span><input value={f.note} onChange={set('note')} maxLength={300} placeholder="e.g. call before coming" /></label>
              <label className="honey" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={f.company} onChange={set('company')} /></label>
            </div>
          </section>
          <section className="card">
            <h2 style={{ marginBottom: 14 }}>Payment</h2>
            <div className="choices">
              {shop.cod && <label className={`choice ${f.payment === 'cod' ? 'on' : ''}`}><input type="radio" name="pay" checked={f.payment === 'cod'} onChange={pick('payment', 'cod')} /><span><b>Cash on delivery</b><small>Pay when you receive the product</small></span></label>}
              {shop.bkash.enabled && <label className={`choice ${f.payment === 'bkash' ? 'on' : ''}`}><input type="radio" name="pay" checked={f.payment === 'bkash'} onChange={pick('payment', 'bkash')} /><span><b>bKash</b><small>Pay now with bKash, then write the Transaction ID</small></span></label>}
            </div>
            {f.payment === 'bkash' && (
              <div className="bkash-box" style={{ marginTop: 14 }}>
                <ol>
                  <li>Open bKash and choose <b>{shop.bkash.type === 'merchant' ? 'Payment' : 'Send Money'}</b>.</li>
                  <li>Number: <span className="bkash-no">{shop.bkash.number}</span></li>
                  <li>Amount: <b>{money(total, shop.currency)}</b></li>
                  <li>Write below the number you paid from and the <b>TrxID</b> from the bKash message.</li>
                </ol>
                <div className="form-grid">
                  <label className="field"><span>Your bKash number</span><input value={f.bkash_sender} onChange={set('bkash_sender')} inputMode="tel" placeholder="01XXXXXXXXX" aria-invalid={!!errors.bkash_sender} /><Err k="bkash_sender" /></label>
                  <label className="field"><span>Transaction ID (TrxID)</span><input value={f.bkash_trx} onChange={set('bkash_trx')} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="e.g. 9AB3CD4EF5" aria-invalid={!!errors.bkash_trx} /><Err k="bkash_trx" /></label>
                </div>
                <small className="muted">The shop checks the payment before sending your order.</small>
              </div>
            )}
          </section>
        </div>
        <aside className="card summary">
          <h2>Your order</h2>
          {lines.map((l) => <div className="sum-row" key={l.product_id}><span>{fqty(l.qty, l.product.unit)} × {l.product.name}</span><span>{money(l.qty * l.product.price, shop.currency)}</span></div>)}
          <div className="sum-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span>Subtotal</span><b>{money(subtotal, shop.currency)}</b></div>
          <div className="sum-row"><span>Delivery</span><b>{money(delivery, shop.currency)}</b></div>
          <div className="sum-row total"><span>Total</span><span>{money(total, shop.currency)}</span></div>
          {fail && <div className="errbox" role="alert">{fail}</div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <><span className="spin" aria-hidden="true" /> Placing order…</> : `Place order — ${money(total, shop.currency)}`}</button>
          <small className="muted">The shop will call you to confirm. {f.payment === 'cod' ? 'Pay in cash when the product arrives.' : ''}</small>
        </aside>
      </div>
    </form>
  );
}
