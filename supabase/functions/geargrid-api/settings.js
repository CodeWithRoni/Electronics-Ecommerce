export function httpsUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  let url;
  try { url = new URL(text); } catch { throw new Error('Enter a valid HTTPS URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || text.length > 2000)
    throw new Error('Enter a valid HTTPS URL');
  return url.href;
}

export function cleanSettings(payload) {
  const limit = Number(payload.low_stock_threshold ?? 5);
  if (!Number.isInteger(limit) || limit < 0 || limit > 100000)
    throw new Error('Low stock threshold must be a whole number from 0 to 100,000');
  const bannerLink = String(payload.banner_link || '').trim();
  const allowedRoute = /^#\/(?:products(?:\?[^#]*)?|p\/[^/?#]+)$/.test(bannerLink);
  return {
    shop_name: String(payload.shop_name || '').trim().slice(0, 80),
    low_stock_threshold: limit,
    header_logo: httpsUrl(payload.header_logo),
    favicon: httpsUrl(payload.favicon),
    banner_image: httpsUrl(payload.banner_image),
    banner_title: String(payload.banner_title || '').trim().slice(0, 100),
    banner_text: String(payload.banner_text || '').trim().slice(0, 250),
    banner_button: String(payload.banner_button || '').trim().slice(0, 40),
    banner_link: allowedRoute && bannerLink.length <= 2000 ? bannerLink : httpsUrl(bannerLink),
  };
}

function footerLink(value) {
  const text = String(value || '').trim();
  if (text.length <= 2000 && /^#\/(?:[a-z0-9_\/-]+)?(?:\?[^#]*)?$/i.test(text)) return text;
  return httpsUrl(text);
}

export function cleanFooter(payload) {
  const field = (name, max = 100) => String(payload[name] || '').trim().slice(0, max);
  const links = Array.isArray(payload.links) ? payload.links : [];
  if (links.length > 18) throw new Error('The footer can contain up to 18 navigation links');
  const email = field('email', 254);
  const phone = field('phone', 32);
  if (email && !/^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(email)) throw new Error('Enter a valid contact email');
  if (phone && !/^\+?[\d ()-]{3,31}$/.test(phone)) throw new Error('Enter a valid support phone number');

  return {
    support_heading: field('support_heading'), links_heading: field('links_heading'),
    contact_heading: field('contact_heading'), support_hours: field('support_hours'), phone,
    locator_label: field('locator_label'), locator_title: field('locator_title'), locator_url: footerLink(payload.locator_url),
    company: field('company'), address: field('address', 450), email, email_label: field('email_label'),
    logo: httpsUrl(payload.logo),
    links: links.map((item) => ({
      label: String(item?.label || '').trim().slice(0, 100), url: footerLink(item?.url),
    })).filter(({ label, url }) => label && url),
    app_prompt: field('app_prompt'), play_label: field('play_label'), play_url: httpsUrl(payload.play_url),
    app_store_label: field('app_store_label'), app_store_url: httpsUrl(payload.app_store_url),
    facebook: httpsUrl(payload.facebook), whatsapp: httpsUrl(payload.whatsapp),
    instagram: httpsUrl(payload.instagram), youtube: httpsUrl(payload.youtube),
    copyright: field('copyright', 200), powered_by: field('powered_by', 150),
    powered_url: footerLink(payload.powered_url),
  };
}
