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
    footer_logo: httpsUrl(payload.footer_logo),
    favicon: httpsUrl(payload.favicon),
    banner_image: httpsUrl(payload.banner_image),
    banner_title: String(payload.banner_title || '').trim().slice(0, 100),
    banner_text: String(payload.banner_text || '').trim().slice(0, 250),
    banner_button: String(payload.banner_button || '').trim().slice(0, 40),
    banner_link: allowedRoute && bannerLink.length <= 2000 ? bannerLink : httpsUrl(bannerLink),
    facebook: httpsUrl(payload.facebook),
    whatsapp: httpsUrl(payload.whatsapp),
    instagram: httpsUrl(payload.instagram),
    youtube: httpsUrl(payload.youtube),
  };
}
