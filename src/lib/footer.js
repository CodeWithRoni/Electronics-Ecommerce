export const footerSocials = [
  ['whatsapp', 'WhatsApp'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['instagram', 'Instagram'],
];

export function footerSettings(settings = {}, shop = {}) {
  const company = settings.shop_name || shop.name || 'GearGrid';
  return {
    support_heading: 'Support', links_heading: 'About us', contact_heading: 'Stay connected',
    phone: shop.phone || shop.tel || '', support_hours: '',
    locator_label: 'Order support', locator_title: 'Track your order', locator_url: '#/track',
    company, address: shop.address || '', email_label: 'Email', email: shop.email || '',
    logo: settings.footer_logo || '',
    links: [
      { label: 'All products', url: '#/products' }, { label: 'Wishlist', url: '#/wishlist' },
      { label: 'Track your order', url: '#/track' },
    ],
    app_prompt: 'Shop on your mobile', play_label: 'Google Play', play_url: '',
    app_store_label: 'App Store', app_store_url: '',
    copyright: `© ${new Date().getFullYear()} ${company} | All rights reserved`,
    powered_by: '', powered_url: '',
    ...Object.fromEntries(footerSocials.map(([key]) => [key, settings[key] || ''])),
    ...settings.footer,
  };
}
