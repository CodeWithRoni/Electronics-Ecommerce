import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShop } from '../lib/store';
import { api } from '../lib/api';
import { money, qty as fqty, fdatetime, bdPhone } from '../lib/format';

const STEPS = [['new', 'Order received'], ['confirmed', 'Confirmed'], ['shipped', 'On the way'], ['delivered', 'Delivered']];

export default function Track() {
  const shop = useShop((s) => s.catalog?.shop);
  const [params] = useSearchParams();
  const [no, setNo] = useState(params.get('no') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [o, setO] = useState(null);
  const find = async (e) => {
    e?.preventDefault();
    setErr(''); setO(null);
    if (!no.trim() || !bdPhone(phone)) { setErr('Write the order number and the mobile number used for the order'); return; }
    setBusy(true);
    try { setO(await api('shop.order.track', { order_no: no.trim(), phone })); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  useEffect(() => { if (params.get('no') && params.get('phone')) find(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const at = (s) => o?.log.find((l) => l.status === s)?.at;
  const reached = o ? (o.status === 'cancelled' ? -1 : STEPS.findIndex(([k]) => k === o.status)) : -1;
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div className="page-title"><h1>Track your order</h1></div>
      <form className="card form-grid" onSubmit={find}>
        <label className="field"><span>Order number</span><input value={no} onChange={(e) => setNo(e.target.value)} placeholder="EE-XXXXXXXXXXXX" autoCapitalize="characters" /></label>
        <label className="field"><span>Mobile number</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01XXXXXXXXX" /></label>
        <div className="wide"><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Finding…' : 'Find my order'}</button></div>
        {err && <div className="errbox wide" role="alert">{err}</div>}
      </form>
      {o && (
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <div className="page-title" style={{ margin: 0 }}><h2>{o.order_no}</h2><span className="muted">{fdatetime(o.created_at)}</span></div>
          {o.status === 'cancelled'
            ? <div className="errbox">This order was cancelled.{shop?.phone ? ` Call ${shop.phone} if you have a question.` : ''}</div>
            : <ol className="timeline">{STEPS.map(([k, label], i) => <li key={k} className={i <= reached ? 'done' : ''}><span><b>{label}</b>{at(k) ? <><br /><small className="muted">{fdatetime(at(k))}</small></> : null}</span></li>)}</ol>}
          <div>
            {o.items.map((l, i) => <div className="sum-row" key={i}><span>{fqty(l.qty, l.unit)} × {l.name}</span><span>{money(l.total, shop?.currency)}</span></div>)}
            <div className="sum-row"><span>Delivery</span><span>{money(o.delivery, shop?.currency)}</span></div>
            <div className="sum-row total"><span>Total</span><span>{money(o.total, shop?.currency)}</span></div>
          </div>
          <p className="muted" style={{ margin: 0 }}>Payment: {o.payment === 'bkash' ? `bKash${o.payment_status === 'verified' ? ' — received' : o.payment_status === 'invalid' ? ' — not received, please call the shop' : ' — being checked'}` : 'Cash on delivery'}{o.invoice_no ? ` · Invoice ${o.invoice_no}` : ''}</p>
        </div>
      )}
    </div>
  );
}
