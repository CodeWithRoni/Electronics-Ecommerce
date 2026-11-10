import { pcSlots } from '../../supabase/functions/geargrid-api/pc-slots.js';

export { corePcSlots, peripheralPcSlots, pcSlots } from '../../supabase/functions/geargrid-api/pc-slots.js';

export function productSlot(product, taxonomy) {
  const explicit = product.pc_specs?.slot;
  if (explicit) return explicit === 'none' ? undefined : explicit;
  const group = taxonomy.find(({ id }) => id === product.group_id);
  const category = group?.categories?.find(({ id }) => id === product.category_id);
  for (const label of [category?.name, group?.name, product.category_id, product.group_id]) {
    const match = label && pcSlots.find(({ pattern }) => pattern.test(label.trim()));
    if (match) return match.id;
  }
}

function normalized(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buildCompatibility(parts) {
  const board = parts.motherboard?.pc_specs || {};
  const processor = parts.cpu?.pc_specs || {};
  const memory = parts.memory?.pc_specs || {};
  const checks = [];
  function check(first, second, label) {
    const a = normalized(first);
    const b = normalized(second);
    if (!a || !b) checks.push({ type: 'unknown', message: `${label}: specifications are missing.` });
    else if (a !== b) checks.push({ type: 'error', message: `${label} mismatch: ${first} and ${second}.` });
    else checks.push({ type: 'pass', message: `${label} matches (${first}).` });
  }
  if (parts.cpu && parts.motherboard) check(processor.socket, board.socket, 'CPU and motherboard socket');
  if (parts.memory && parts.motherboard) check(memory.memory, board.memory, 'RAM and motherboard memory type');
  return checks;
}

export function isOffer(product) {
  return Number(product.compare_at_price) > Number(product.price);
}
