import { create } from 'zustand';
import { api } from './api';
import { withDemoProducts } from './demoProducts';

const CART = 'electronics_shop_cart', THEME = 'electronics_shop_theme', CATALOG = 'electronics_shop_catalog';
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const systemTheme = () => (globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

export const useShop = create((set, get) => ({
  catalog: read(CATALOG, null) ? withDemoProducts(read(CATALOG, null)) : null, // last catalogue: the page shows it at once, then refreshes
  loading: false,
  error: '',
  cart: read(CART, []), // [{ product_id, qty }]
  theme: read(THEME, null) || systemTheme(),
  toasts: [],

  async load() {
    if (get().loading) return;
    set({ loading: true, error: '' });
    try {
      const catalog = await api('shop.catalog');
      write(CATALOG, catalog);
      set({ catalog: withDemoProducts(catalog), loading: false });
    } catch (e) {
      // Public demo catalog remains browsable without a configured backend.
      const fallback = { shop: { name: 'Electronics E-commerce — Demo', open: true, currency: 'BDT', address: '', phone: '', email: '', notice: 'DEMO CATALOG — sample prices only; demo products cannot be ordered.', cod: false, bkash: { enabled: false }, delivery: { inside: 0, outside: 0, inside_label: 'Demo' } }, products: [], groups: [], brands: [] };
      set({ catalog: withDemoProducts(read(CATALOG, null) || fallback), loading: false, error: e.message });
    }
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
