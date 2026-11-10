import { useRef, useState } from 'react';
import { downloadTaxonomy, readTaxonomy } from '../lib/taxonomyExcel';

const sections = {
  group: { title: 'Categories', singular: 'category', icon: 'box', description: 'Top-level groups shown in the storefront navigation.' },
  category: { title: 'Subcategories', singular: 'subcategory', icon: 'branches', description: 'Organize products within a parent category.' },
  brand: { title: 'Brands', singular: 'brand', icon: 'tag', description: 'Manage product manufacturers and brand filters.' },
};
const newEntry = (kind) => ({ kind, id: '', group_id: '', name: '' });

function TaxonomyCard({ kind, items, groups, busy, save, remove, importRows, Icon }) {
  const { title, singular, icon, description } = sections[kind];
  const [entry, setEntry] = useState(null);
  const [search, setSearch] = useState('');
  const [parent, setParent] = useState('');
  const [preview, setPreview] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);
  const disabled = busy || working;
  const isSubcategory = kind === 'category';
  const visible = items.filter((item) => (!parent || item.group_id === parent)
    && [item.name, item.group_name].some((name) => name?.toLowerCase().includes(search.trim().toLowerCase())));
  const change = (key, value) => setEntry((current) => ({ ...current, [key]: value }));
  const demoParent = groups.find(({ id }) => id === parent)?.name || groups[0]?.name || 'Sample Category';

  async function fileAction(action) {
    setWorking(true);
    setError('');
    try { await action(); }
    catch (issue) { setError(issue.message || 'The workbook could not be processed.'); }
    finally { setWorking(false); }
  }

  const demoRows = [
    { name: kind === 'group' ? 'Sample Category' : kind === 'brand' ? 'Sample Brand' : 'Sample Subcategory', group_name: demoParent },
  ];

  return <section className="console-panel taxonomy-card" aria-labelledby={`taxonomy-${kind}`}>
    <header className="taxonomy-card-heading">
      <div className="taxonomy-card-icon"><Icon name={icon} size={19} /></div>
      <div className="taxonomy-card-title"><h2 id={`taxonomy-${kind}`}>{title}</h2><span>{items.length}</span></div>
      <div className="taxonomy-file-actions">
        {[
          ['import', `Import ${title} from Excel`, () => fileInput.current.click()],
          ['export', `Export ${title} to Excel`, () => fileAction(() => downloadTaxonomy(kind, items))],
          ['file', `Download ${title} Demo Excel`, () => fileAction(() => downloadTaxonomy(kind, demoRows, true))],
        ].map(([actionIcon, label, onClick]) => <button key={actionIcon} type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}>
          <Icon name={actionIcon} size={17} />
        </button>)}
        <input ref={fileInput} hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const file = event.currentTarget.files[0];
            event.currentTarget.value = '';
            if (!file) return;
            setPreview(null);
            fileAction(async () => setPreview({ file: file.name, rows: await readTaxonomy(kind, file, groups) }));
          }} />
      </div>
    </header>
    <p className="taxonomy-card-description">{description}</p>
    <div className="taxonomy-card-body">
      {error && <p className="console-alert" role="alert">{error}</p>}
      {preview && <div className="taxonomy-preview">
        <strong>Import preview · {preview.rows.length} {preview.rows.length === 1 ? 'row' : 'rows'}</strong>
        <small>{preview.file}</small>
        <ul>{preview.rows.slice(0, 4).map(({ name, group_name }, i) => <li key={i}>{name}{group_name && <small>{group_name}</small>}</li>)}</ul>
        {preview.rows.length > 4 && <small>+ {preview.rows.length - 4} more</small>}
        <p>Existing names in the same section are skipped.</p>
        <div className="console-row-actions">
          <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => importRows(kind, preview.rows, () => setPreview(null))}>Confirm import</button>
          <button type="button" className="btn" disabled={disabled} onClick={() => setPreview(null)}>Cancel</button>
        </div>
      </div>}
      <div className="taxonomy-toolbar">
        <input type="search" aria-label={`Search ${title}`} placeholder={`Search ${title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="button" className="btn btn-primary" disabled={disabled || (isSubcategory && !groups.length)} onClick={() => setEntry({ ...newEntry(kind), group_id: parent })}>+ Add {singular}</button>
        {isSubcategory && <select aria-label="Filter by parent category" value={parent} onChange={(event) => setParent(event.target.value)}>
          <option value="">All parent categories</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>}
      </div>
      {entry && <form className="taxonomy-editor" onSubmit={(event) => {
        event.preventDefault();
        save(entry, () => { setEntry(null); setSearch(''); });
      }}>
        <strong>{entry.id ? 'Edit' : 'New'} {singular}</strong>
        {isSubcategory && <label className="field"><span>Parent category</span>
          <select required disabled={disabled || Boolean(entry.id)} value={entry.group_id} onChange={(event) => change('group_id', event.target.value)}>
            <option value="">Choose a category</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>}
        <label className="field"><span>Name</span><input required maxLength={100} disabled={disabled} value={entry.name} onChange={(event) => change('name', event.target.value)} /></label>
        <div className="console-row-actions">
          <button className="btn btn-primary" disabled={disabled || !entry.name.trim()}>{entry.id ? 'Save name' : `Create ${singular}`}</button>
          <button type="button" className="btn" disabled={disabled} onClick={() => setEntry(null)}>Cancel</button>
        </div>
      </form>}
      {visible.length ? <ul className="taxonomy-list">
        {visible.map((item) => <li key={JSON.stringify([item.group_id, item.id])}>
          <div><strong>{item.name}</strong>
            {item.group_name && <small>{item.group_name}</small>}
            {kind === 'group' && <small>{item.categories.length} {item.categories.length === 1 ? 'subcategory' : 'subcategories'}</small>}
          </div>
          <div className="taxonomy-item-actions">
            <button type="button" title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} disabled={disabled} onClick={() => setEntry({ ...item, kind })}><Icon name="edit" size={16} /></button>
            <button type="button" title={`Delete ${item.name}`} aria-label={`Delete ${item.name}`} disabled={disabled} onClick={() => {
              if (window.confirm(`Delete ${item.name}?`)) remove({ ...item, kind }, () => {
                if (entry?.id === item.id && entry.group_id === item.group_id) setEntry(null);
                if (parent === item.id) setParent('');
              });
            }}><Icon name="trash" size={16} /></button>
          </div>
        </li>)}
      </ul> : <p className="taxonomy-empty">{isSubcategory && !groups.length ? 'Add a category first.' : items.length ? 'No entries match your filters.' : `No ${title.toLowerCase()} yet.`}</p>}
    </div>
  </section>;
}

export default function AdminTaxonomy({ groups, brands, Icon, ...actions }) {
  const categories = groups.flatMap((group) => group.categories.map((category) => ({
    ...category, group_id: group.id, group_name: group.name,
  })));
  const lists = { group: groups, category: categories, brand: brands };

  return <div className="taxonomy-grid">
    {Object.keys(sections).map((kind) =>
      <TaxonomyCard key={kind} kind={kind} items={lists[kind]} groups={groups} Icon={Icon} {...actions} />)}
    <section className="console-panel taxonomy-card" aria-labelledby="taxonomy-attributes">
      <header className="taxonomy-card-heading">
        <div className="taxonomy-card-icon"><Icon name="settings" size={19} /></div>
        <div className="taxonomy-card-title"><h2 id="taxonomy-attributes">Attributes &amp; Variants</h2><span>Planned</span></div>
      </header>
      <p className="taxonomy-card-description">Product options such as color, size and configuration.</p>
    </section>
  </div>;
}
