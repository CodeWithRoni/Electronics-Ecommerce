import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RetailIcon } from '../components/retail';
import { downloadBuildImage, PcBuildPrint } from '../components/PcBuildExport';
import { API_URL } from '../config';
import { customerAuth } from '../lib/customerAuth';
import { brandLogo } from '../lib/brand';
import { money } from '../lib/format';
import { footerSettings } from '../lib/footer';
import { buildCompatibility, corePcSlots, pcSlots, peripheralPcSlots, productSlot } from '../lib/pcBuilder';
import { useShop } from '../lib/store';

const guestStorageKey = `geargrid_pc_build:${API_URL}`;
const savedKey = `${guestStorageKey}:saved`;
const slotGroups = [
  { title: 'Core Components', slots: corePcSlots },
  { title: 'Peripherals & Others', slots: peripheralPcSlots },
];
const powerSlots = [...corePcSlots.map(({ id }) => id).filter((id) => id !== 'power'), 'case_cooler', 'network_adapter'];

function savedBuild(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Object.fromEntries(pcSlots.filter(({ id }) => typeof value?.[id] === 'string').map(({ id }) => [id, value[id]]));
  } catch { return {}; }
}

export default function PcBuilder({ session }) {
  const { shop, groups, products, settings } = useShop((state) => state.catalog);
  const addBuild = useShop((state) => state.addBuild);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buildId = searchParams.get('saved');
  const builds = session?.user.user_metadata?.saved_pcs;
  const accountBuild = Array.isArray(builds) ? builds.find(({ id }) => id === buildId) : undefined;
  const [saving, setSaving] = useState(false);
  const storageKey = session ? `${guestStorageKey}:${session.user.id}` : guestStorageKey;
  const [selected, setSelected] = useState(() => accountBuild?.parts || savedBuild(storageKey));
  const [saved, setSaved] = useState(() => savedBuild(savedKey));
  const [choosing, setChoosing] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    if (accountBuild) setSelected(accountBuild.parts);
  }, [accountBuild]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch { /* storage unavailable */ }
  }, [selected, storageKey]);
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
  const regularPrice = (part) => Math.max(Number(part.price), Number(part.compare_at_price) || 0);
  const footer = footerSettings(settings, shop);
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '/pc-builder';
  const exportData = {
    name: footer.company || shop.name,
    contact: [footer.phone && `Phone: ${footer.phone}`, footer.email && `Email: ${footer.email}`].filter(Boolean).join(' · '),
    url: url.href,
    rows: pcSlots.map(({ id, label }) => {
      const part = parts[id];
      return { id, cells: [label, part?.name || '', part ? money(part.price, shop.currency) : '', part ? money(regularPrice(part), shop.currency) : ''] };
    }),
    totals: [total, money(chosen.reduce((sum, part) => sum + regularPrice(part), 0), shop.currency)],
  };
  const powered = powerSlots.map((id) => parts[id]).filter(Boolean);
  const watts = powered.map((part) => part.pc_specs?.watts).filter((value) => Number.isFinite(value) && value >= 0);
  const change = (value) => { setSelected(value); setError(''); setNotice(''); };
  const close = () => dialog.current.close();
  const add = () => {
    const issue = addBuild(chosen.map(({ id }) => id));
    if (issue) setError(issue);
    else navigate('/cart');
  };

  async function savePC() {
    setError('');
    setNotice('');
    if (!session) {
      try {
        localStorage.setItem(savedKey, JSON.stringify(selected));
        setSaved(selected);
        setNotice('Build saved in this browser.');
      } catch { setError('This browser could not save your build.'); }
      return;
    }
    const list = Array.isArray(builds) ? builds : [];
    if (!accountBuild && list.length >= 10) {
      setError('You can save up to 10 PCs. Delete a saved PC from your account to make room.');
      return;
    }
    const name = window.prompt('Name your saved PC', accountBuild?.name || 'My PC build')?.trim();
    if (!name) return;
    setSaving(true);
    try {
      const build = { id: accountBuild?.id || crypto.randomUUID(), name: name.slice(0, 80), date: new Date().toISOString(), parts: selected };
      const saved_pcs = [build, ...list.filter(({ id }) => id !== build.id)];
      const { error } = await customerAuth.updateUser({ data: { saved_pcs } });
      if (error) throw error;
      navigate(`/pc-builder?saved=${encodeURIComponent(build.id)}`, { replace: true });
      setNotice('Build saved to your account.');
    } catch (issue) { setError(issue.message || 'Could not save your build.'); }
    finally { setSaving(false); }
  }

  return <div className="builder-page">
    <nav className="crumbs" aria-label="Breadcrumb"><Link to="/" aria-label="Home"><RetailIcon name="home-solid" size={15} /></Link><span aria-hidden="true">/</span><span>PC Builder</span></nav>
    <section className="builder-sheet">
      <header className="builder-actions">
        <span className="builder-brand"><img src={settings?.header_logo || brandLogo} alt={shop.name} /></span>
        <div>
          <button type="button" disabled={!chosen.length || unavailable || mismatch} onClick={add}><RetailIcon name="box" size={19} />Add to Cart</button>
          <button type="button" disabled={!chosen.length || saving || session === undefined} onClick={savePC}>
            <RetailIcon name="storage" size={19} />{saving ? 'Saving…' : 'Save PC'}
          </button>
          <button type="button" onClick={() => window.print()}><RetailIcon name="printer" size={19} />Print</button>
          <button type="button" disabled={exporting} onClick={async () => {
            setError('');
            setExporting(true);
            try { await downloadBuildImage(exportData); }
            catch { setError('This browser could not export the build image.'); }
            finally { setExporting(false); }
          }}><RetailIcon name="camera" size={19} />Screenshot</button>
        </div>
      </header>
      <div className="builder-content">
        <div className="builder-meta">
          <div><h1>PC Builder – Build Your Own Computer</h1><label className="check"><input type="checkbox" checked={hideEmpty} onChange={(event) => setHideEmpty(event.target.checked)} /> Hide Unconfigured Components</label></div>
          <div className="builder-figures">
            <div><strong>{!powered.length ? '0 W' : watts.length ? `${watts.reduce((a, b) => a + b, 0)} W` : '—'}</strong><small>{watts.length && watts.length < powered.length ? 'Partial wattage' : 'Estimated Wattage'}</small></div>
            <div><strong>{total}</strong><small>{chosen.length} {chosen.length === 1 ? 'item' : 'items'}</small></div>
          </div>
        </div>
        {slotGroups.map(({ title, slots }) => {
          const visibleSlots = slots.filter(({ id }) => !hideEmpty || selected[id]);
          return <Fragment key={title}>
            <h2>{title}</h2>
            {visibleSlots.length > 0 && <section aria-label={title}>
              {visibleSlots.map(({ id, label, icon, required }) => {
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
            </section>}
          </Fragment>;
        })}
        <div className="builder-notes">
          {!hideEmpty && missing.length > 0 && <p>Core parts still to choose: {missing.join(', ')}.</p>}
          {unavailable && <p role="alert">Remove or replace unavailable selections before adding your parts.</p>}
          <ul className="builder-checks">{checks.map(({ type, message }) => <li key={message} data-status={type}>{message}</li>)}</ul>
          {!hideEmpty && <p>Compatibility checks cover CPU socket and RAM type when specs are available. Confirm power and case clearance separately.</p>}
          {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
          {(!hideEmpty || Object.values(selected).some(Boolean) || Object.values(saved).some(Boolean)) && <div className="builder-secondary">
            <button type="button" className="btn" disabled={!Object.values(selected).some(Boolean)} onClick={() => change({})}>Clear build</button>
            {Object.values(saved).some(Boolean) && <button type="button" className="btn" onClick={() => change(saved)}>{session ? 'Load browser-saved PC' : 'Load saved PC'}</button>}
          </div>}
        </div>
      </div>
    </section>
    <PcBuildPrint {...exportData} />
    <dialog className="builder-picker" ref={dialog} onClose={() => setChoosing('')}>
      <header><h2>Choose {pcSlots.find(({ id }) => id === choosing)?.label}</h2><button type="button" className="btn" onClick={close}>Close</button></header>
      {options[choosing]?.length ? <ul>{options[choosing].map((product) => <li key={product.id}>
        <div><strong>{product.name}</strong><small>{money(product.price, shop.currency)}{product.in_stock ? '' : ' · Out of stock'}</small></div>
        <button type="button" className="btn btn-primary" disabled={!product.in_stock} onClick={() => { change({ ...selected, [choosing]: product.id }); close(); }}>Select</button>
      </li>)}</ul> : <p>There are no catalog items for this component yet.</p>}
    </dialog>
  </div>;
}
