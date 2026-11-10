import { httpsUrl } from './settings.js';

export const registrationEmailDefaults = {
  shop_name: 'GearGrid',
  logo: 'https://codewithroni.github.io/GearGrid/apple-touch-icon.png',
  website: 'https://codewithroni.github.io/GearGrid/',
  subject: '',
  heading: 'Please confirm your email',
  message: 'Thanks for creating an account. Confirm your email address to finish setting up your account.',
  button: 'Confirm my email',
  address: '',
  email: '',
  phone: '',
};

export function cleanRegistrationEmail(input) {
  const text = (key, max) => String(input[key] || '').trim().slice(0, max);
  const email = text('email', 254);
  const phone = text('phone', 32);
  if (email && !/^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(email)) throw new Error('Enter a valid contact email');
  if (phone && !/^\+?[\d ()-]{3,31}$/.test(phone)) throw new Error('Enter a valid contact phone number');
  return {
    shop_name: text('shop_name', 100) || registrationEmailDefaults.shop_name,
    logo: httpsUrl(input.logo), website: httpsUrl(input.website),
    subject: text('subject', 120).replace(/[{}\r\n]/g, ' '),
    heading: text('heading', 100) || registrationEmailDefaults.heading,
    message: text('message', 700) || registrationEmailDefaults.message,
    button: text('button', 45) || registrationEmailDefaults.button,
    address: text('address', 450), email, phone,
  };
}

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '{': '&#123;', '}': '&#125;' };
const escape = (value) => value.replace(/[&<>"'{}]/g, (char) => entities[char]);
const multiline = (value) => escape(value).replace(/\r?\n/g, '<br>');

export function registrationEmailTemplate(input, preview = false) {
  const config = cleanRegistrationEmail(input);
  const name = escape(config.shop_name);
  const subject = (config.subject || `Confirm your email for ${config.shop_name}`).replace(/[{}\r\n]/g, ' ');
  const confirmationLink = preview ? '#' : '{{ .ConfirmationURL }}';
  const contacts = [
    config.email && `<a style="color:#a8301c" href="mailto:${escape(config.email)}">${escape(config.email)}</a>`,
    config.phone && `<a style="color:#a8301c" href="tel:${config.phone.replace(/[^+\d]/g, '')}">${escape(config.phone)}</a>`,
  ].filter(Boolean);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;background:#edf1f6;font-family:Arial,sans-serif;color:#172338">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf1f6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #dce4ef;border-radius:14px;overflow:hidden;text-align:left">
<tr><td style="background:#0b1823;color:#fff;padding:20px 26px">
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
${config.logo ? `<td style="padding-right:13px"><img src="${escape(config.logo)}" alt="" width="48" style="display:block;max-width:48px;height:auto;border-radius:8px"></td>` : ''}
<td style="font-size:22px;font-weight:bold;color:#fff">${name}</td></tr></table>
</td></tr>
<tr><td style="padding:28px 26px">
<p style="margin:0 0 8px;color:#a8301c;font-size:12px;font-weight:bold;letter-spacing:1px">ACCOUNT VERIFICATION</p>
<h1 style="margin:0 0 14px;font-size:27px;line-height:1.2">${escape(config.heading)}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6">${multiline(config.message)}</p>
<a href="${confirmationLink}" style="display:inline-block;background:#b63721;color:#fff;padding:13px 20px;border-radius:8px;font-weight:bold;text-decoration:none">${escape(config.button)}</a>
<p style="margin:22px 0 0;color:#526077;font-size:13px;line-height:1.6">If you didn’t request this account, you can ignore this email.</p>
</td></tr>
<tr><td style="padding:19px 26px;background:#f5f7fa;border-top:1px solid #dce4ef;font-size:13px;line-height:1.7;overflow-wrap:anywhere">
<strong>${name}</strong>
${config.address ? `<br>${multiline(config.address)}` : ''}
${contacts.length ? `<br>${contacts.join(' &nbsp;·&nbsp; ')}` : ''}
${config.website ? `<br><a href="${escape(config.website)}" style="color:#a8301c">Visit our shop</a>` : ''}
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html };
}

export async function publishRegistrationEmail(env, config) {
  const token = env.GEARGRID_AUTH_CONFIG_TOKEN;
  const project = env.SUPABASE_PROJECT_REF;
  if (!token || !/^[a-z0-9]{20}$/.test(project || '')) {
    throw new Error('Automatic publishing is not configured. Copy the subject and HTML into Supabase Email Templates.');
  }
  const { subject, html } = registrationEmailTemplate(config);
  let response;
  try {
    response = await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`, {
      method: 'PATCH', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mailer_subjects_confirmation: subject, mailer_templates_confirmation_content: html }),
    });
  } catch { throw new Error('Could not reach Supabase to publish the email template'); }
  if (!response.ok) throw new Error(`Supabase declined the email template update (HTTP ${response.status})`);
  return { published: true };
}
