export const money = (n, cur = 'Tk') => `${cur} ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const qty = (n, unit) => `${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit && unit !== 'pcs' ? ` ${unit}` : ''}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fdatetime(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/.exec(String(s || ''));
  if (!m) return '';
  const h = Number(m[4] || 0), ap = h < 12 ? 'AM' : 'PM', h12 = h % 12 || 12;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}${m[4] ? `, ${h12}:${m[5]} ${ap}` : ''}`;
}
export const warrantyText = (days) => {
  if (!days) return '';
  if (days % 365 === 0) return `${days / 365} year${days === 365 ? '' : 's'} warranty`;
  if (days % 30 === 0) return `${days / 30} month${days === 30 ? '' : 's'} warranty`;
  return `${days} days warranty`;
};
/** Bangladesh mobile → 01XXXXXXXXX, or '' when it is not one. Same rule as the backend. */
export function bdPhone(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2);
  if (d.length === 10 && d[0] === '1') d = `0${d}`;
  return /^01[3-9]\d{8}$/.test(d) ? d : '';
}
