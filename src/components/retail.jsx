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

export function shopDepartments(groups = []) {
  const catalogLinks = groups.map(({ id, name }) => ({
    name,
    to: '/products?g=' + encodeURIComponent(id),
    icon: departmentIcon(name),
  }));
  const browseLinks = departments
    .filter(([name]) => !groups.some((group) => group.name.toLowerCase() === name.toLowerCase()))
    .map(([name, icon]) => ({ name, icon, to: '/products?q=' + encodeURIComponent(name) }));
  return [...catalogLinks, ...browseLinks];
}

function departmentIcon(name) {
  const match = departments.find(([label]) => label.toLowerCase() === name.toLowerCase());
  if (match) return match[1];
  if (/router|wi-fi|network|switch/i.test(name)) return 'network';
  if (/ram|motherboard|processor|graphics|power supply|component/i.test(name)) return 'chip';
  if (/ssd|hdd|drive|memory/i.test(name)) return 'storage';
  return 'box';
}

const icons = {
  laptop: <><rect x="5" y="4" width="14" height="12" rx="1.5" /><path d="M5 16 2 20h20l-3-4M10 18h4" /></>,
  desktop: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M10 7h4m-4 3h4" /><circle cx="12" cy="17" r="1" /></>,
  monitor: <><rect x="2.5" y="3" width="19" height="13" rx="2" /><path d="M12 16v5m-5 0h10" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx=".5" /><path d="M9 3v3m6-3v3m-6 12v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3" /></>,
  network: <><rect x="2.5" y="12" width="19" height="8" rx="2" /><path d="M6 12V5m12 7V5M7 16h.01m4 0h.01m4 0h2" /></>,
  storage: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M10 17h4m-2-7 3 4" /></>,
  keyboard: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01m4 0h.01m4 0h.01m4 0h.01M6 14h.01m4 0h4m4 0h.01" /></>,
  printer: <><path d="M6 8V3h12v5M6 17H3V9h18v8h-3m-1-5h1" /><path d="M6 14h12v7H6z" /></>,
  box: <><path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Zm0 18v-9m-9-4.5 9 4.5 9-4.5M7.5 5.3l9 4.5" /></>,
  truck: <><path d="M2 5h13v12H2zM15 9h4l3 4v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  wallet: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 10h18M6 15h3" /></>,
  heart: <path d="M20.8 5.7a5 5 0 0 0-7.1 0L12 7.4l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.2a5 5 0 0 0 0-7.1Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />,
};

export function RetailIcon({ name, size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}
