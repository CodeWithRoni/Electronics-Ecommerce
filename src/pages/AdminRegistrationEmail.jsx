import { useState } from 'react';
import { ImageField } from './AdminStore';
import { footerSettings } from '../lib/footer';
import { cleanRegistrationEmail, registrationEmailDefaults, registrationEmailTemplate } from '../../supabase/functions/geargrid-api/registration-email';

const fields = [
  ['shop_name', 'Shop name', 100], ['subject', 'Email subject', 120],
  ['heading', 'Email heading', 100], ['button', 'Confirmation button label', 45],
  ['email', 'Contact email', 254, 'email'], ['phone', 'Contact phone', 32, 'tel'],
  ['website', 'Shop website', 2000, 'url'],
];

export default function AdminRegistrationEmail({ settings, shop, busy, upload, save, publish, canPublish }) {
  const [draft, setDraft] = useState(() => {
    const footer = footerSettings(settings, shop);
    return {
      ...registrationEmailDefaults, shop_name: footer.company || shop?.name || 'GearGrid',
      address: footer.address, email: footer.email, phone: footer.phone,
      ...settings.registration_email,
    };
  });
  const [copyStatus, setCopyStatus] = useState('');
  const change = (key, value) => {
    setCopyStatus('');
    setDraft((current) => ({ ...current, [key]: value }));
  };
  let output, preview, invalid, cleanDraft;
  try {
    cleanDraft = cleanRegistrationEmail(draft);
    output = registrationEmailTemplate(cleanDraft);
    preview = registrationEmailTemplate(cleanDraft, true).html;
  } catch (error) { invalid = error.message; }

  async function copy(value, name) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${name} copied.`);
    } catch { setCopyStatus('Select and copy the text below.'); }
  }

  return <div className="console-registration-email">
    <form className="console-panel console-settings" onSubmit={(event) => { event.preventDefault(); save(draft); }}>
      <div className="console-panel-heading"><div><h2>Email branding</h2><p>Customize the email customers receive after registration. Use a PNG or JPEG logo for broad email client support.</p></div></div>
      <ImageField label="Email logo or icon" value={draft.logo} onChange={(value) => change('logo', value)} upload={upload} busy={busy} />
      <div className="console-settings-grid">
        {fields.map(([key, label, maxLength, type]) => <label key={key} className="field"><span>{label}</span>
          <input value={draft[key]} type={type || 'text'} maxLength={maxLength} onChange={(event) => change(key, event.target.value)} />
        </label>)}
      </div>
      <label className="field"><span>Email message</span><textarea rows={4} maxLength={700} value={draft.message} onChange={(event) => change('message', event.target.value)} /></label>
      <label className="field"><span>Shop address / location</span><textarea rows={3} maxLength={450} value={draft.address} onChange={(event) => change('address', event.target.value)} /></label>
      {invalid && <p className="console-alert" role="alert">{invalid}</p>}
      <div className="console-row-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || Boolean(invalid)}>Save email settings</button>
        {canPublish && <button type="button" className="btn" disabled={busy || !settings.registration_email || Boolean(invalid)
          || Object.keys(cleanDraft).some((key) => cleanDraft[key] !== settings.registration_email[key])} onClick={publish}>Publish to Supabase</button>}
      </div>
    </form>
    <section className="console-panel console-email-preview">
      <h2>Email preview</h2>
      {output && <>
        <p className="console-email-subject"><strong>Subject</strong> {output.subject}</p>
        <iframe title="Registration email preview" sandbox="" srcDoc={preview} />
        <p>{canPublish ? 'Save changes, then choose Publish to Supabase to update the live signup email.' : 'To activate this template, copy the subject and HTML into Supabase Authentication → Email Templates → Confirm signup, then save there.'}</p>
        <div className="console-row-actions">
          <button type="button" className="btn" onClick={() => copy(output.subject, 'Subject')}>Copy subject</button>
          <button type="button" className="btn" onClick={() => copy(output.html, 'HTML')}>Copy HTML</button>
        </div>
        {copyStatus && <p role="status">{copyStatus}</p>}
        <details><summary>Template source</summary>
          <label className="field"><span>Subject</span><input readOnly value={output.subject} /></label>
          <label className="field"><span>HTML template</span><textarea readOnly rows={6} value={output.html} /></label>
        </details>
      </>}
    </section>
  </div>;
}
