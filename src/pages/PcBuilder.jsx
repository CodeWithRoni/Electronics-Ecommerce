import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RetailIcon } from '../components/retail';
import { API_URL } from '../config';
import { brandLogo } from '../lib/brand';
import { money } from '../lib/format';
import { buildCompatibility, pcSlots, productSlot } from '../lib/pcBuilder';
import { useShop } from '../lib/store';

const storageKey = `geargrid_pc_build:${API_URL}`;
const savedKey = `${storageKey}:saved`;
const slotOrder = ['cpu', 'cooler', 'motherboard', 'memory', 'storage', 'graphics', 'power', 'case'];

function savedBuild(key = storageKey) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Object.fromEntries(pcSlots.filter(({ id }) => typeof value?.[id] === 'string').map(({ id }) => [id, value[id]]));
  } catch { return {}; }
}

function downloadBuildImage(shopName, rows, total) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 190 + rows.length * 62;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#101629';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`${shopName} PC Build`, 40, 62, 1120);
  rows.forEach(({ label, name, price }, index) => {
    const y = 94 + 62 * index;
    ctx.fillStyle = index % 2 ? '#fff' : '#f1f3f7';
    ctx.fillRect(32, y, 1176, 62);
    ctx.fillStyle = '#18243a';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(label, 48, y + 38, 185);
    ctx.font = '22px sans-serif';
    ctx.fillText(name, 250, y + 38, 765);
    ctx.textAlign = 'right';
    ctx.fillText(price, 1188, y + 38, 150);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = '#1f4987';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`Total: ${total}`, 48, canvas.height - 36);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'geargrid-pc-build.png';
  link.click();
}

export default function PcBuilder() {
  const { shop, groups, products, settings } = useShop((state) => state.catalog);
  const addBuild = useShop((state) => state.addBuild);
  const navigate = useNavigate();
  const [selected, setSelected] = useState(savedBuild);
  const [saved, setSaved] = useState(() => savedBuild(savedKey));
  const [choosing, setChoosing] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch { /* storage unavailable */ }
  }, [selected]);
  useEffect(() => {
    if (choosing && !dialog.current.open) dialog.current.showModal();
  }, [choosing]);

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
  const total = money(chosen.reduce((sum, part) => sum + Number(part.price), 0), shop.currency);
  const powered = Object.entries(parts).filter(([id, part]) => id !== 'power' && part);
  const watts = powered.map(([, part]) => part.pc_specs?.watts).filter((value) => Number.isFinite(value) && value >= 0);
  const change = (value) => { setSelected(value); setError(''); setNotice(''); };
  const close = () => dialog.current.close();
  const add = () => {
    const issue = addBuild(chosen.map(({ id }) => id));
    if (issue) setError(issue);
    else navigate('/cart');
  };

  return <div className="builder-page">
    <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span>PC Builder</span></nav>
    <section className="builder-sheet">
      <header className="builder-actions">
        <span className="builder-brand"><img src={settings?.header_logo || brandLogo} alt={shop.name} /></span>
        <div>
          <button type="button" disabled={!chosen.length || unavailable || mismatch} onClick={add}><RetailIcon name="box" size={19} />Add to Cart</button>
          <button type="button" disabled={!chosen.length} onClick={() => {
            try {
              localStorage.setItem(savedKey, JSON.stringify(selected));
              setSaved(selected);
              setNotice('Build saved in this browser.');
            } catch { setError('This browser could not save your build.'); }
          }}><RetailIcon name="storage" size={19} />Save PC</button>
          <button type="button" onClick={() => window.print()}><RetailIcon name="printer" size={19} />Print</button>
          <button type="button" disabled={!chosen.length} onClick={() => downloadBuildImage(shop.name, pcSlots.filter(({ id }) => parts[id]).map(({ id, label }) => ({
            label, name: parts[id].name, price: money(parts[id].price, shop.currency),
          })), total)}><RetailIcon name="camera" size={19} />Screenshot</button>
        </div>
      </header>
      <div className="builder-content">
        <div className="builder-meta">
          <div><h1>PC Builder – Build Your Own Computer</h1><label className="check"><input type="checkbox" checked={hideEmpty} onChange={(event) => setHideEmpty(event.target.checked)} /> Hide unconfigured components</label></div>
          <div className="builder-figures">
            <div><strong>{!chosen.length ? '0 W' : watts.length ? `${watts.reduce((a, b) => a + b, 0)} W` : '—'}</strong><small>{watts.length && watts.length < powered.length ? 'Partial wattage' : 'Estimated Wattage'}</small></div>
            <div><strong>{total}</strong><small>{chosen.length} {chosen.length === 1 ? 'item' : 'items'}</small></div>
          </div>
        </div>
        <h2>Core Components</h2>
        <section aria-label="PC components">
          {slotOrder.map((id) => pcSlots.find((slot) => slot.id === id)).filter(({ id }) => !hideEmpty || selected[id]).map(({ id, label, icon, required }) => {
            const part = parts[id];
            return <div className="builder-slot" key={id}>
              <span className="builder-slot-icon"><RetailIcon name={icon} size={24} /></span>
              <div className="builder-slot-fields">
                <div><strong>{label}</strong> {required && <small className="builder-required">Required</small>}</div>
                {part ? <Link to={`/p/${encodeURIComponent(part.id)}`}>{part.name}</Link> : <span className="muted">{selected[id] ? 'Previously selected item unavailable' : 'No component selected'}</span>}
              </div>
              {part && <strong className="builder-part-price">{money(part.price, shop.currency)}</strong>}
              <div className="builder-slot-actions">
                <button type="button" className="btn" aria-label={`Choose ${label}`} onClick={() => setChoosing(id)}>{part ? 'Change' : 'Choose'}</button>
                {selected[id] && <button type="button" className="builder-remove" onClick={() => change({ ...selected, [id]: '' })}>Remove<span className="sr-only"> {label}</span></button>}
              </div>
            </div>;
          })}
        </section>
        <div className="builder-notes">
          {missing.length > 0 && <p>Core parts still to choose: {missing.join(', ')}.</p>}
          {unavailable && <p role="alert">Remove or replace unavailable selections before adding your parts.</p>}
          <ul className="builder-checks">{checks.map(({ type, message }) => <li key={message} data-status={type}>{message}</li>)}</ul>
          <p>Compatibility checks cover CPU socket and RAM type when specs are available. Confirm power and case clearance separately.</p>
          {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
          <div className="builder-secondary">
            <button type="button" className="btn" disabled={!Object.values(selected).some(Boolean)} onClick={() => change({})}>Clear build</button>
            {Object.values(saved).some(Boolean) && <button type="button" className="btn" onClick={() => change(saved)}>Load saved PC</button>}
          </div>
        </div>
      </div>
    </section>
    <dialog className="builder-picker" ref={dialog} onClose={() => setChoosing('')}>
      <header><h2>Choose {pcSlots.find(({ id }) => id === choosing)?.label}</h2><button type="button" className="btn" onClick={close}>Close</button></header>
      {options[choosing]?.length ? <ul>{options[choosing].map((product) => <li key={product.id}>
        <div><strong>{product.name}</strong><small>{money(product.price, shop.currency)}{product.in_stock ? '' : ' · Out of stock'}</small></div>
        <button type="button" className="btn btn-primary" disabled={!product.in_stock} onClick={() => { change({ ...selected, [choosing]: product.id }); close(); }}>Select</button>
      </li>)}</ul> : <p>There are no catalog items for this component yet.</p>}
    </dialog>
  </div>;
}
