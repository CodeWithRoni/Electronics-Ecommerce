const departments = [
  ['Laptop', 'laptop'],
  ['Desktop', 'desktop'],
  ['Monitor', 'monitor'],
  ['Components', 'chip'],
  ['Networking', 'network'],
  ['Storage', 'storage'],
  ['Accessories', 'keyboard'],
  ['Printer', 'printer'],
];

export function shopDepartments(groups = [], useFallback = true) {
  const catalogLinks = groups.map(({ id, name }) => ({
    id, name,
    to: '/products?g=' + encodeURIComponent(id),
    icon: departmentIcon(name),
  }));
  if (!useFallback) return catalogLinks;
  const browseLinks = departments
    .filter(([name]) => !groups.some((group) => group.name.toLowerCase() === name.toLowerCase()))
    .map(([name, icon]) => ({ name, icon, to: '/products?q=' + encodeURIComponent(name) }));
  return [...catalogLinks, ...browseLinks];
}

const extraDepartmentIcons = {
  camera: 'camera', gadget: 'device', gaming: 'gamepad', lifestyle: 'heart',
  'office equipment': 'printer', power: 'bolt', security: 'shield', software: 'code',
};

function departmentIcon(name) {
  const normalized = name.trim().toLowerCase();
  const match = departments.find(([label]) => label.toLowerCase() === normalized);
  if (match) return match[1];
  if (/router|wi-fi|network|switch/i.test(name)) return 'network';
  if (/ram|motherboard|processor|graphics|power supply|component/i.test(name)) return 'chip';
  if (/ssd|hdd|drive|memory/i.test(name)) return 'storage';
  return Object.hasOwn(extraDepartmentIcons, normalized) ? extraDepartmentIcons[normalized] : 'box';
}

const icons = {
  laptop: <><rect x="5" y="4" width="14" height="12" rx="1.5" /><path d="M5 16 2 20h20l-3-4M10 18h4" /></>,
  desktop: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M10 7h4m-4 3h4" /><circle cx="12" cy="17" r="1" /></>,
  monitor: <><rect x="2.5" y="3" width="19" height="13" rx="2" /><path d="M12 16v5m-5 0h10" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx=".5" /><path d="M9 3v3m6-3v3m-6 12v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3" /></>,
  network: <><rect x="2.5" y="12" width="19" height="8" rx="2" /><path d="M6 12V5m12 7V5M7 16h.01m4 0h.01m4 0h2" /></>,
  storage: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M10 17h4m-2-7 3 4" /></>,
  keyboard: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01m4 0h.01m4 0h.01m4 0h.01M6 14h.01m4 0h4m4 0h.01" /></>,
  device: <><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M11 18h2" /></>,
  gamepad: <><path d="M7.5 7h9c2 0 3.3 1.3 3.7 3.2l1 4.8c.4 2-1.7 3.3-3.2 2l-2.5-2h-7L6 17c-1.5 1.3-3.6 0-3.2-2l1-4.8C4.2 8.3 5.5 7 7.5 7Z" /><path d="M7 11h4m-2-2v4m6-2h.01m2.5 1.5h.01" /></>,
  code: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m9 9-3 3 3 3m6-6 3 3-3 3" /></>,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="3" /></>,
  printer: <><path d="M6 8V3h12v5M6 17H3V9h18v8h-3m-1-5h1" /><path d="M6 14h12v7H6z" /></>,
  box: <><path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Zm0 18v-9m-9-4.5 9 4.5 9-4.5M7.5 5.3l9 4.5" /></>,
  truck: <><path d="M2 5h13v12H2zM15 9h4l3 4v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  wallet: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 10h18M6 15h3" /></>,
  heart: <path d="M20.8 5.7a5 5 0 0 0-7.1 0L12 7.4l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.2a5 5 0 0 0 0-7.1Z" />,
  fan: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="6" /><path d="M12 6v6l5 3m-5-3-5 3" /></>,
  mouse: <><rect x="6" y="3" width="12" height="18" rx="6" /><path d="M12 3v6" /></>,
  speaker: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="14" r="3" /><path d="M12 7h.01" /></>,
  headphones: <path d="M3 14v-2a9 9 0 0 1 18 0v2M3 14v3a2 2 0 0 0 2 2h3v-7H5a2 2 0 0 0-2 2Zm18 0v3a2 2 0 0 1-2 2h-3v-7h3a2 2 0 0 1 2 2Z" />,
  shield: <path d="M12 3 4 6v5c0 5 4 8 8 10 4-2 8-5 8-10V6l-8-3Zm-3 9 2 2 4-4" />,
  ups: <><rect x="3" y="3" width="13" height="18" rx="2" /><path d="M7 7h5m-5 4h5m-5 6h.01M16 17h2a2 2 0 0 0 2-2v-3m-2-2v2h4v-2m-3 0V8m2 2V8" /></>,
  'home-solid': <path fill="currentColor" stroke="none" d="M2 11.5 12 3l10 8.5h-3v8h-5v-5h-4v5H5v-8z" />,
  home: <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  gift: <><path d="M4 10h16v11H4zM3 7h18v4H3zM12 7v14" /><path d="M12 7C8 7 6 6 7 4s5 0 5 3Zm0 0c4 0 6-1 5-3s-5 0-5 3Z" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2Z" /></>,
  phone: <path d="M6 3h3l1.5 4-2 1.8a15 15 0 0 0 6.7 6.7l1.8-2 4 1.5v3c0 1-1 2-2 2C10.2 20 4 13.8 4 5c0-1 .9-2 2-2Z" />,
  pin: <><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>,
  playstore: <><path d="M4 3v18l15-9L4 3Zm0 0 11 12M4 21l11-12" /></>,
  appstore: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m9 7 6.5 11M14 7l-5.7 9M7 14h10" /></>,
  facebook: <path d="M14 21v-8h3l.5-3H14V8c0-1 .4-2 2-2h2V3.3A17 17 0 0 0 15.5 3C12.8 3 11 4.7 11 7.7V10H8v3h3v8" />,
  whatsapp: <><path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.5L3 21l1.7-4.9A8.4 8.4 0 1 1 20.5 11.8Z" /><path d="M9 8c-1.4 1.4.2 4.7 2.4 6.4 2 1.6 3.7 1.8 4.6.3l-2.4-1.4-.8 1c-1.7-.8-2.8-2-3.3-3.3l.8-.8L9 8Z" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.6h.01" /></>,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9 5 3-5 3z" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />,
};

export function RetailIcon({ name, size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}
