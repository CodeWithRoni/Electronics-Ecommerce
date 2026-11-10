import { useState } from 'react';

export default function AdminAttributes({ attributes, busy, Icon, changeAttribute }) {
  const [draft, setDraft] = useState(null);

  function edit(attribute, value) {
    setDraft({
      attribute_id: value ? attribute.id : '',
      id: (value || attribute)?.id || '',
      name: (value || attribute)?.name || '',
    });
  }

  function remove(item, attribute_id) {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    changeAttribute(attribute_id ? 'value.delete' : 'delete', { id: item.id, attribute_id }, () => {
      if (draft?.id === item.id || draft?.attribute_id === item.id) setDraft(null);
    });
  }

  return <section className="console-panel taxonomy-card" aria-labelledby="taxonomy-attributes">
    <header className="taxonomy-card-heading">
      <div className="taxonomy-card-icon"><Icon name="settings" size={19} /></div>
      <div className="taxonomy-card-title"><h2 id="taxonomy-attributes">Attributes &amp; Variants</h2><span>{attributes.length}</span></div>
    </header>
    <p className="taxonomy-card-description">Create reusable options for product editing and catalog filters.</p>
    <div className="taxonomy-card-body">
      <button type="button" className="btn btn-primary attribute-add" disabled={busy} onClick={() => edit()}>+ Add attribute</button>
      {draft && <form className="taxonomy-editor" onSubmit={(event) => {
        event.preventDefault();
        changeAttribute(draft.attribute_id ? 'value.save' : 'save', draft, () => setDraft(null));
      }}>
        <label className="field"><span>{draft.attribute_id ? 'Option name' : 'Attribute name'}</span>
          <input required maxLength={80} disabled={busy} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <div className="console-row-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !draft.name.trim()}>{draft.attribute_id ? 'Save option' : 'Save attribute'}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
        </div>
      </form>}
      {!attributes.length && <p className="taxonomy-empty">Add an attribute such as Color, then add options such as Black or Silver.</p>}
      <ul className="taxonomy-list">
        {attributes.map((attribute) => <li className="attribute-entry" key={attribute.id}>
          <details>
            <summary><strong>{attribute.name}</strong> <small>{attribute.values.length} {attribute.values.length === 1 ? 'option' : 'options'}</small></summary>
            <div className="attribute-option-controls">
              <button type="button" className="btn" disabled={busy} onClick={() => edit(attribute, {})}>+ Add option</button>
              <div className="taxonomy-item-actions">
                <button type="button" title={`Edit ${attribute.name}`} aria-label={`Edit ${attribute.name}`} disabled={busy} onClick={() => edit(attribute)}><Icon name="edit" size={16} /></button>
                <button type="button" title={`Delete ${attribute.name}`} aria-label={`Delete ${attribute.name}`} disabled={busy} onClick={() => remove(attribute, '')}><Icon name="trash" size={16} /></button>
              </div>
            </div>
            <ul className="taxonomy-list attribute-option-list">
              {attribute.values.map((value) => <li key={value.id}>
                <span>{value.name}</span>
                <div className="taxonomy-item-actions">
                  <button type="button" title={`Edit ${attribute.name}: ${value.name}`} aria-label={`Edit ${attribute.name}: ${value.name}`} disabled={busy} onClick={() => edit(attribute, value)}><Icon name="edit" size={16} /></button>
                  <button type="button" title={`Delete ${attribute.name}: ${value.name}`} aria-label={`Delete ${attribute.name}: ${value.name}`} disabled={busy} onClick={() => remove(value, attribute.id)}><Icon name="trash" size={16} /></button>
                </div>
              </li>)}
            </ul>
          </details>
        </li>)}
      </ul>
    </div>
  </section>;
}

export function ProductAttributes({ attributes, selected, busy, change }) {
  const available = attributes.filter((attribute) => attribute.values.length);
  return <fieldset className="console-wide product-attributes">
    <legend>Attributes &amp; Variants</legend>
    {available.length ? available.map((attribute) => <div key={attribute.id} className="product-attribute-group" role="group" aria-label={attribute.name}>
      <strong>{attribute.name}</strong>
      <div className="product-attribute-options">
        {attribute.values.map(({ id, name }) => <label key={id}>
          <input type="checkbox" checked={selected.includes(id)} disabled={busy} onChange={(event) =>
            change(event.target.checked ? [...selected, id] : selected.filter((value) => value !== id))} />
          {name}
        </label>)}
      </div>
    </div>) : <p>Create attributes and options in Categories &amp; Subcategories to select them here.</p>}
  </fieldset>;
}
