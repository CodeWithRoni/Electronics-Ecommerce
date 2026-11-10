import { useState } from 'react';
import { footerSettings, footerSocials } from '../lib/footer';
import { ImageField } from './AdminStore';

const blocks = [
  ['Support', [
    ['support_heading', 'Support heading'], ['support_hours', 'Support hours'],
    ['phone', 'Support phone number', 'tel'], ['locator_label', 'Store locator label'],
    ['locator_title', 'Store locator button text'], ['locator_url', 'Store locator link'],
  ]],
  ['Stay connected', [
    ['contact_heading', 'Contact heading'], ['company', 'Company name'], ['address', 'Business address', 'textarea'],
    ['email_label', 'Email label'], ['email', 'Contact email', 'email'],
  ]],
  ['App download buttons', [
    ['app_prompt', 'App section text'], ['play_label', 'Google Play button text'], ['play_url', 'Google Play URL', 'url'],
    ['app_store_label', 'App Store button text'], ['app_store_url', 'App Store URL', 'url'],
  ]],
  ['Social links', footerSocials.map(([key, label]) => [key, label, 'url'])],
  ['Bottom bar', [
    ['copyright', 'Copyright text'], ['powered_by', 'Powered by text'], ['powered_url', 'Powered by link'],
  ]],
];

export default function AdminFooter({ settings, shop, busy, save, upload }) {
  const [draft, setDraft] = useState(() => footerSettings(settings, shop));
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const changeLink = (index, key, value) => setDraft((current) => ({
    ...current, links: current.links.map((link, i) => i === index ? { ...link, [key]: value } : link),
  }));
  const moveLink = (index, shift) => setDraft((current) => {
    const links = [...current.links];
    const target = index + shift;
    [links[index], links[target]] = [links[target], links[index]];
    return { ...current, links };
  });
  const field = ([key, label, type]) => <label key={key} className="field"><span>{label}</span>
    {type === 'textarea' ? <textarea value={draft[key]} onChange={(event) => change(key, event.target.value)} /> :
      <input type={type || 'text'} value={draft[key]} onChange={(event) => change(key, event.target.value)} />}
  </label>;

  return <form className="console-settings" onSubmit={(event) => { event.preventDefault(); save(draft); }}>
    <section className="console-panel">
      <div className="console-panel-heading"><div><h2>Footer branding</h2><p>Upload a logo or paste an HTTPS image URL.</p></div></div>
      <ImageField label="Footer logo" value={draft.logo} busy={busy} upload={upload} onChange={(value) => change('logo', value)} />
    </section>
    <section className="console-panel">
      <div className="console-panel-heading"><div><h2>Footer navigation</h2><p>Use an HTTPS URL or a store route such as #/products. Use the arrows to change the order.</p></div></div>
      {field(['links_heading', 'Navigation heading'])}
      <div className="console-footer-links">
        {draft.links.map((link, index) => <div className="console-footer-link" key={index}>
          <label className="field"><span>Link {index + 1} text</span>
            <input required value={link.label} onChange={(event) => changeLink(index, 'label', event.target.value)} />
          </label>
          <label className="field"><span>Link {index + 1} destination</span>
            <input required value={link.url} onChange={(event) => changeLink(index, 'url', event.target.value)} />
          </label>
          <div className="console-row-actions">
            <button type="button" className="btn" aria-label={`Move link ${index + 1} up`} disabled={index === 0 || busy} onClick={() => moveLink(index, -1)}>↑</button>
            <button type="button" className="btn" aria-label={`Move link ${index + 1} down`} disabled={index + 1 === draft.links.length || busy} onClick={() => moveLink(index, 1)}>↓</button>
            <button type="button" className="btn console-danger" aria-label={`Remove link ${index + 1}`} disabled={busy} onClick={() => change('links', draft.links.filter((_, i) => i !== index))}>Remove</button>
          </div>
        </div>)}
      </div>
      <button type="button" className="btn" disabled={draft.links.length >= 18 || busy} onClick={() => change('links', [...draft.links, { label: '', url: '' }])}>+ Add footer link</button>
    </section>
    {blocks.map(([heading, fields]) => <section key={heading} className="console-panel">
      <div className="console-panel-heading"><h2>{heading}</h2></div>
      <div className="console-settings-grid">{fields.map(field)}</div>
    </section>)}
    <div className="console-settings-actions">
      <small>Empty contact details, app links and social links stay hidden.</small>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Working…' : 'Save footer settings'}</button>
    </div>
  </form>;
}
