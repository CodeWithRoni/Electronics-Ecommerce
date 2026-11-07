import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShop } from '../lib/store';
import { ProductCard, Empty } from '../components/ui';

const SORTS = [['new', 'Newest'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['name', 'Name']];

export default function Products() {
  const { shop, products, groups, brands } = useShop((s) => s.catalog);
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const q = params.get('q') || '', g = params.get('g') || '', c = params.get('c') || '', b = params.get('b') || '';
  const inStock = params.get('stock') === '1', sort = params.get('sort') || 'new';
  const set = (patch) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setParams(n, { replace: true }); setOpen(false); };

  const brandName = useMemo(() => Object.fromEntries(brands.map((x) => [x.id, x.name])), [brands]);
  const catName = useMemo(() => Object.fromEntries(groups.flatMap((x) => [[x.id, x.name], ...x.categories.map((y) => [y.id, y.name])])), [groups]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = useMemo(() => products.filter((p) => {
    if (g && p.group_id !== g) return false;
    if (c && p.category_id !== c) return false;
    if (b && p.brand_id !== b) return false;
    if (inStock && !p.in_stock) return false;
    if (!words.length) return true;
    const hay = [p.name, p.sku, brandName[p.brand_id], catName[p.group_id], catName[p.category_id], p.description].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  }).sort((x, y) => sort === 'low' ? x.price - y.price : sort === 'high' ? y.price - x.price : sort === 'name' ? x.name.localeCompare(y.name) : (x.created_at < y.created_at ? 1 : -1)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [products, g, c, b, inStock, sort, q, brandName, catName]);
  const count = (pred) => products.filter(pred).length;
  const group = groups.find((x) => x.id === g);
  const title = q ? `Results for “${q}”` : c ? catName[c] : g ? catName[g] : b ? brandName[b] : 'All products';

  return (
    <>
      <div className="page-title"><h1>{title}</h1><span className="muted">{list.length} product{list.length === 1 ? '' : 's'}</span></div>
      <div className="shop-layout">
        <aside className={`filters ${open ? 'open' : ''}`} aria-label="Filters">
          <div className="card">
            <h3>Groups</h3>
            <div className="filter-list">
              <button type="button" className={!g ? 'on' : ''} onClick={() => set({ g: '', c: '' })}>All <small>{products.length}</small></button>
              {groups.map((x) => (
                <div key={x.id}>
                  <button type="button" className={g === x.id && !c ? 'on' : ''} onClick={() => set({ g: x.id, c: '' })}>{x.name} <small>{count((p) => p.group_id === x.id)}</small></button>
                  {g === x.id && x.categories.map((y) => <button key={y.id} type="button" className={`sub ${c === y.id ? 'on' : ''}`} onClick={() => set({ g: x.id, c: y.id })}>{y.name} <small>{count((p) => p.category_id === y.id)}</small></button>)}
                </div>
              ))}
            </div>
          </div>
          {brands.length > 0 && <div className="card">
            <h3>Brands</h3>
            <div className="filter-list">
              <button type="button" className={!b ? 'on' : ''} onClick={() => set({ b: '' })}>All brands</button>
              {brands.map((x) => <button key={x.id} type="button" className={b === x.id ? 'on' : ''} onClick={() => set({ b: x.id })}>{x.name} <small>{count((p) => p.brand_id === x.id)}</small></button>)}
            </div>
          </div>}
        </aside>
        <section>
          <div className="toolbar">
            <button type="button" className="btn filters-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide filters' : 'Filters'}{(g || b) ? ' •' : ''}</button>
            <label className="check"><input type="checkbox" checked={inStock} onChange={(e) => set({ stock: e.target.checked ? '1' : '' })} /> In stock only</label>
            <select value={sort} onChange={(e) => set({ sort: e.target.value === 'new' ? '' : e.target.value })} aria-label="Sort">{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          {group && group.categories.length > 0 && <nav className="chips" style={{ marginBottom: 12 }} aria-label={`${group.name} categories`}>
            <button type="button" className={`chip ${!c ? 'on' : ''}`} onClick={() => set({ c: '' })}>All {group.name}</button>
            {group.categories.map((y) => <button key={y.id} type="button" className={`chip ${c === y.id ? 'on' : ''}`} onClick={() => set({ c: y.id })}>{y.name}</button>)}
          </nav>}
          {list.length ? <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} brand={brandName[p.brand_id]} currency={shop.currency} />)}</div>
            : <Empty title="No products found"><button type="button" className="btn" onClick={() => setParams({}, { replace: true })}>Clear search and filters</button></Empty>}
        </section>
      </div>
    </>
  );
}
