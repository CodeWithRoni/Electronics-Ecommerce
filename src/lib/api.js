import { API_URL, IMAGE_BASE } from '../config';

/** POST to the Karvio backend. text/plain avoids the CORS pre-flight Apps Script cannot answer. */
export async function api(action, payload = {}) {
  let res;
  try {
    res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, payload }) });
  } catch {
    throw new Error('No internet connection. Please check your connection and try again.');
  }
  let body;
  try { body = await res.json(); } catch { throw new Error('The shop could not be reached. Please try again in a moment.'); }
  if (!body.ok) throw new Error(body.error || 'Something went wrong');
  return body.data;
}

export const imageUrl = (id, width = 600) => `${IMAGE_BASE}${encodeURIComponent(id)}=w${width}`;
export const newRef = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
