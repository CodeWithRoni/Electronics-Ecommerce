import { useState } from 'react';

const types = { group: 'Groups', category: 'Categories', brand: 'Brands' };
const freshEntry = (kind = 'group') => ({ kind, id: '', group_id: '', name: '' });

export function ImageField({ label, value, onChange, upload, busy }) {
  return <div className="console-media">
    <label className="field"><span>{label}</span>
      <input type="url" placeholder="https://…" value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
    <div className="console-media-tools">
      {value?.startsWith('https://') && <img src={value} alt="" loading="lazy" />}
      <label className="btn console-upload">
        Upload image
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,.ico"
          aria-label={`Upload ${label}`} disabled={busy} onChange={(event) => {
            const file = event.target.files[0];
            event.target.value = '';
            if (file) upload(file, onChange);
          }} />
      </label>
      <small>Up to 3 MB</small>
    </div>
  </div>;
}

export function Taxonomy({ groups, brands, busy, save, remove, initialKind = 'group' }) {
  const [entry, setEntry] = useState(() => freshEntry(initialKind));
  const categories = groups.flatMap((group) => group.categories.map((category) => ({
    ...category, group_id: group.id, group_name: group.name,
  })));
  const lists = { group: groups, category: categories, brand: brands };
  const change = (key, value) => setEntry((current) => ({ ...current, [key]: value }));

  return <section className="console-panel">
    <div className="console-panel-heading"><div><h2>Catalog structure</h2><p>Organize products into groups, categories and brands.</p></div></div>
    <div className="console-segments" aria-label="Catalog type">
      {Object.entries(types).map(([kind, label]) => <button key={kind} type="button" className="btn"
        aria-pressed={entry.kind === kind} disabled={busy} onClick={() => setEntry(freshEntry(kind))}>
        {label} <span>{lists[kind].length}</span>
      </button>)}
    </div>
    <form className="console-taxonomy-form" onSubmit={(event) => {
      event.preventDefault();
      save(entry, () => setEntry(freshEntry(entry.kind)));
    }}>
      {entry.kind === 'category' && <label className="field"><span>Parent group</span>
        <select required disabled={!!entry.id} value={entry.group_id} onChange={(event) => change('group_id', event.target.value)}>
          <option value="">Choose a group</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>}
      <label className="field"><span>{entry.kind === 'category' ? 'Category' : entry.kind === 'brand' ? 'Brand' : 'Group'} name</span>
        <input required maxLength={100} value={entry.name} onChange={(event) => change('name', event.target.value)} />
      </label>
      <button className="btn btn-primary" disabled={busy}>{entry.id ? 'Save name' : `Add ${entry.kind}`}</button>
      {entry.id && <button type="button" className="btn" disabled={busy} onClick={() => setEntry(freshEntry(entry.kind))}>Cancel</button>}
    </form>
    {lists[entry.kind].length ? <ul className="console-catalog-list">
      {lists[entry.kind].map((item) => <li key={JSON.stringify([item.group_id, item.id])}>
        <div><strong>{item.name}</strong>{item.group_name && <small>{item.group_name}</small>}</div>
        <div className="console-row-actions">
          <button className="btn" disabled={busy} onClick={() => setEntry({ ...item, kind: entry.kind })}>Edit</button>
          <button className="btn console-danger" disabled={busy} onClick={() => {
            if (window.confirm(`Delete ${item.name}?`)) remove({ ...item, kind: entry.kind }, () => {
              if (entry.id === item.id && entry.group_id === item.group_id) setEntry(freshEntry(entry.kind));
            });
          }}>Delete</button>
        </div>
      </li>)}
    </ul> : <p className="console-empty">{entry.kind === 'category' && !groups.length ? 'Create a group first, then add its categories.' : `No ${types[entry.kind].toLowerCase()} yet.`}</p>}
  </section>;
}

export function StoreSettings({ initial, save, upload, busy, section }) {
  const [draft, setDraft] = useState(initial);
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const media = (key, label) => <ImageField key={key} label={label} value={draft[key]} onChange={(value) => change(key, value)} upload={upload} busy={busy} />;
  const field = (key, label, props = {}) => <label key={key} className="field"><span>{label}</span>
    <input {...props} value={draft[key] ?? (key === 'low_stock_threshold' ? 5 : '')}
      onChange={(event) => change(key, event.target.value)} />
  </label>;

  const bannerFields = ['banner_image', 'banner_title', 'banner_text', 'banner_button', 'banner_link'];
  const generalFields = ['shop_name', 'low_stock_threshold', 'header_logo', 'favicon'];
  const isBanner = section === 'banners';
  return <form className="console-settings" onSubmit={(event) => { event.preventDefault();
    const keys = isBanner ? bannerFields : generalFields;
    save(Object.fromEntries(keys.filter((key) => key in draft).map((key) => [key, draft[key]]))); }}>
    {!isBanner && <section className="console-panel">
      <div className="console-panel-heading"><div><h2>Brand & inventory</h2><p>Use an HTTPS image link or upload directly from your device.</p></div></div>
      <div className="console-settings-grid">
        {field('shop_name', 'Store name', { maxLength: 80, placeholder: 'GearGrid' })}
        {field('low_stock_threshold', 'Low stock alert threshold', { type: 'number', min: 0, max: 100000, required: true })}
        {media('header_logo', 'Header logo')}
        {media('favicon', 'Browser tab icon (favicon)')}
      </div>
    </section>}
    {isBanner && <section className="console-panel">
      <div className="console-panel-heading"><div><h2>Homepage banner</h2><p>Empty fields use the default banner. To list a product under Offers, set its regular price above its selling price in Products & inventory.</p></div></div>
      <div className="console-settings-grid">
        {media('banner_image', 'Banner image')}
        {field('banner_title', 'Headline', { maxLength: 100 })}
        {field('banner_text', 'Description', { maxLength: 250 })}
        {field('banner_button', 'Button label', { maxLength: 40 })}
        {field('banner_link', 'Button destination', { placeholder: '#/products or https://…' })}
      </div>
    </section>}
    <div className="console-settings-actions">
      <small>Changes appear on the storefront after you save.</small>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Working…' : 'Save storefront settings'}</button>
    </div>
  </form>;
}
