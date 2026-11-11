import { create } from 'zustand';
import { api } from './api';
import { API_URL } from '../config';

// A different API can reuse product IDs for different items.
const CART = `electronics_shop_cart:${API_URL}`;
const CATALOG = `electronics_shop_catalog:${API_URL}`;
const THEME = 'electronics_shop_theme';
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const systemTheme = () => (globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

export const useShop = create((set, get) => ({
  catalog: read(CATALOG, null), // last catalogue: the page shows it at once, then refreshes
  loading: false,
  error: '',
  cart: read(CART, []), // [{ product_id, qty }]
  theme: read(THEME, null) || systemTheme(),
  toasts: [],

  clearCatalogCache() {
    localStorage.removeItem(CATALOG);
    set({ catalog: null, error: '' });
  },

  async load() {
    if (get().loading) return;
    set({ loading: true, error: '' });
    try {
      const catalog = await api('shop.catalog');
      write(CATALOG, catalog);
      set({ catalog, loading: false });
    } catch (e) { set({ loading: false, error: e.message }); }
  },
  product: (id) => get().catalog?.products.find((p) => p.id === id),

  setQty(product_id, qty) {
    const cart = get().cart.map((l) => (l.product_id === product_id ? { ...l, qty } : l)).filter((l) => l.qty > 0);
    write(CART, cart); set({ cart });
  },
  add(product, qty = 1) {
    const cur = get().cart.find((l) => l.product_id === product.id);
    const cart = cur ? get().cart.map((l) => (l.product_id === product.id ? { ...l, qty: Math.round((l.qty + qty) * 100) / 100 } : l)) : [...get().cart, { product_id: product.id, qty }];
    write(CART, cart); set({ cart });
    get().toast(`${product.name} added to cart`);
  },
  addBuild(ids) {
    const { cart, catalog } = get();
    const next = new Map(cart.map((line) => [line.product_id, { ...line }]));
    for (const id of ids) {
      const product = catalog?.products.find((item) => item.id === id);
      const qty = Number(next.get(id)?.qty || 0) + 1;
      if (!product?.in_stock || Number(product.stock) < qty) {
        return `Not enough stock for ${product?.name || id}, including items already in your cart.`;
      }
      next.set(id, { product_id: id, qty });
    }
    const updated = [...next.values()];
    write(CART, updated);
    set({ cart: updated });
    return '';
  },
  remove(product_id) { const cart = get().cart.filter((l) => l.product_id !== product_id); write(CART, cart); set({ cart }); },
  clearCart() { write(CART, []); set({ cart: [] }); },

  toggleTheme() { const theme = get().theme === 'dark' ? 'light' : 'dark'; write(THEME, theme); set({ theme }); },
  toast(msg, kind = 'ok') {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, msg, kind }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), kind === 'err' ? 6000 : 2600);
  }
}));

/** Cart lines joined with the live catalogue (price, stock, still on sale). */
export function cartLines(cart, catalog) {
  const byId = Object.fromEntries((catalog?.products || []).map((p) => [p.id, p]));
  return cart.map((l) => ({ ...l, product: byId[l.product_id] || null }));
}
