import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RetailIcon } from '../components/retail';
import { API_URL } from '../config';
import { money } from '../lib/format';
import { buildCompatibility, pcSlots, productSlot } from '../lib/pcBuilder';
import { useShop } from '../lib/store';

const storageKey = `geargrid_pc_build:${API_URL}`;
function savedBuild() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return Object.fromEntries(pcSlots.filter(({ id }) => typeof value?.[id] === 'string').map(({ id }) => [id, value[id]]));
  } catch { return {}; }
}

export default function PcBuilder() {
  const { shop, groups, products } = useShop((state) => state.catalog);
  const addBuild = useShop((state) => state.addBuild);
  const navigate = useNavigate();
  const [selected, setSelected] = useState(savedBuild);
  const [error, setError] = useState('');
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch { /* storage unavailable */ }
  }, [selected]);

  const options = Object.fromEntries(pcSlots.map(({ id }) => [id, []]));
  for (const product of products) {
    const slot = productSlot(product, groups);
    if (Object.hasOwn(options, slot)) options[slot].push(product);
  }
  const parts = Object.fromEntries(pcSlots.map(({ id }) => [id, options[id].find((product) => product.id === selected[id])]));
  const chosen = Object.values(parts).filter(Boolean);
  const missing = pcSlots.filter(({ id, required }) => required && !parts[id]).map(({ label }) => label);
  const unavailable = pcSlots.some(({ id }) => selected[id] && !parts[id]?.in_stock);
  const checks = buildCompatibility(parts);
  const mismatch = checks.some(({ type }) => type === 'error');
  const total = chosen.reduce((sum, part) => sum + Number(part.price), 0);
  const choose = (id, value) => {
    setError('');
    setSelected((current) => ({ ...current, [id]: value }));
  };

  return <div className="builder-page">
    <header className="builder-heading">
      <div><span>GEARGRID WORKSHOP</span><h1>PC Builder</h1><p>Pick parts from the GearGrid catalog and see the total as you build.</p></div>
      <button className="btn" disabled={!Object.values(selected).some(Boolean)} onClick={() => { setSelected({}); setError(''); }}>Clear build</button>
    </header>
    <div className="builder-grid">
      <section className="builder-slots" aria-label="PC components">
        {pcSlots.map(({ id, label, icon, required }) => {
          const part = parts[id];
          const stale = Boolean(selected[id] && !part);
          return <div className="builder-slot" key={id}>
            <span className="builder-slot-icon"><RetailIcon name={icon} size={24} /></span>
            <div className="builder-slot-fields">
              <label htmlFor={`builder-${id}`}><strong>{label}</strong> <small>{required ? 'Core part' : 'Optional'}</small></label>
              <select id={`builder-${id}`} value={selected[id] || ''} onChange={(event) => choose(id, event.target.value)}>
                <option value="">{options[id].length ? `Choose ${label.toLowerCase()}` : 'No catalog items yet'}</option>
                {stale && <option value={selected[id]}>Previously selected item unavailable</option>}
                {options[id].map((product) => <option key={product.id} value={product.id} disabled={!product.in_stock}>
                  {product.name} · {money(product.price, shop.currency)}{!product.in_stock ? ' · Out of stock' : ''}
                </option>)}
              </select>
              {part && <Link to={`/p/${encodeURIComponent(part.id)}`}>View product details</Link>}
            </div>
            {part && <strong className="builder-part-price">{money(part.price, shop.currency)}</strong>}
          </div>;
        })}
      </section>
      <aside className="builder-summary" aria-label="Build summary">
        <h2>Build summary</h2>
        <p>{chosen.length} selected</p>
        <div className="builder-total"><span>Parts subtotal</span><strong>{money(total, shop.currency)}</strong></div>
        {missing.length > 0 && <p>Core parts still to choose: {missing.join(', ')}.</p>}
        {unavailable && <p role="alert">Remove or replace unavailable selections before adding your parts.</p>}
        <ul className="builder-checks">
          {checks.map(({ type, message }) => <li key={message} data-status={type}>{message}</li>)}
        </ul>
        <p className="builder-note">Checks cover CPU socket and RAM type when specs are available. Confirm power, case clearance and other requirements separately.</p>
        {error && <p role="alert">{error}</p>}
        <button type="button" className="btn btn-primary" disabled={!chosen.length || unavailable || mismatch} onClick={() => {
          const issue = addBuild(chosen.map(({ id }) => id));
          if (issue) setError(issue);
          else navigate('/cart');
        }}>Add selected parts to cart</button>
      </aside>
    </div>
  </div>;
}
