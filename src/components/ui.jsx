import { useState } from 'react';
import { Link } from 'react-router-dom';
import { imageUrl } from '../lib/api';
import { useShop } from '../lib/store';
import { money } from '../lib/format';

export const SearchIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const CartIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h3l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.2a1.6 1.6 0 0 0 1.6-1.2L21 8H6.6" /></svg>;
export const ThemeIcon = ({ dark }) => dark
  ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" /></svg>
  : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" /></svg>;

const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function Photo({ product, id, width = 500, alt }) {
  const [broken, setBroken] = useState(false);
  const pic = id || product?.images?.[0];
  return (
    <div className="photo">
      {pic && !broken
        ? <img src={imageUrl(pic, width)} alt={alt ?? product?.name ?? ''} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        : <div className="ph" aria-hidden="true">{initials(product?.name)}</div>}
    </div>
  );
}

export function StockBadge({ p }) {
  if (!p.in_stock) return <span className="badge badge-bad">Out of stock</span>;
  if (p.low_stock) return <span className="badge badge-warn">Few left</span>;
  return <span className="badge badge-ok">In stock</span>;
}

export function ProductCard({ p, brand, currency }) {
  const add = useShop((s) => s.add);
  return (
    <article className="pcard">
      <Link to={`/p/${p.id}`} aria-label={p.name}>
        <Photo product={p} width={400} />
        <div className="pcard-body">
          {brand && <span className="pcard-brand">{brand}</span>}
          <span className="pcard-name">{p.name}</span>
          <span className="price">{money(p.price, currency)}{p.decimal ? <small className="muted"> / {p.unit}</small> : null}</span>
        </div>
      </Link>
      <div className="pcard-foot">
        <StockBadge p={p} />
        <button type="button" className="btn btn-primary" disabled={!p.in_stock} onClick={() => add(p, 1)} aria-label={`Add ${p.name} to cart`}>Add to cart</button>
      </div>
    </article>
  );
}

export function Stepper({ value, onChange, min = 1, max = 50, step = 1, small, label = 'Quantity' }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <span className={`stepper ${small ? 'sm' : ''}`}>
      <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Less ${label}`}>−</button>
      <input type="number" inputMode="decimal" value={value} min={min} max={max} step={step} aria-label={label}
        onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v > 0) set(v); }} onWheel={(e) => e.currentTarget.blur()} />
      <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label={`More ${label}`}>+</button>
    </span>
  );
}

export const Empty = ({ title, children }) => <div className="empty"><b>{title}</b>{children}</div>;
export const Spinner = ({ label = 'Loading' }) => <div className="empty"><span className="spin" aria-hidden="true" /><span>{label}…</span></div>;
