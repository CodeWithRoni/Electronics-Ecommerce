import { API_URL } from '../config';
export async function api(action, payload = {}, token) {
  if (!API_URL) throw new Error('Store backend is not configured yet. Set VITE_API_URL to your independent API endpoint.');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action, payload }) });
  } catch { throw new Error('Cannot reach the store server. Check your internet connection.'); }
  let body;
  try { body = await res.json(); } catch { throw new Error('The store server returned an invalid response.'); }
  if (!res.ok || !body.ok) throw new Error(body.error || 'Request failed');
  return body.data;
}
export const imageUrl = (id) => {
  if (!id) return '';
  if (/^https:\/\//i.test(id)) return id;
  return '';
};
export const newRef = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
