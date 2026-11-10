// The Supabase key is a Worker secret. It is never included in the storefront.
export const usesSupabase = (env) => env.DATABASE_PROVIDER === 'supabase';

export async function supabaseData(env, action, payload = {}) {
  const key = env.SUPABASE_SECRET_KEY;
  if (!env.SUPABASE_URL || !key) throw new Error('Store database is not configured');
  const headers = { 'Content-Type': 'application/json', apikey: key };
  // Supabase's legacy service_role key is a JWT. New sb_secret_ keys use apikey only.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  let response;
  try {
    const endpoint = new URL('/rest/v1/rpc/geargrid_data', env.SUPABASE_URL);
    response = await fetch(endpoint, {
      method: 'POST', headers, body: JSON.stringify({ p_action: action, p_payload: payload }),
    });
  } catch {
    throw new Error('Store database is temporarily unavailable');
  }
  const data = await response.json().catch(() => null);
  if (response.ok && data !== null) return data;
  if (data?.code === 'P0001' && (data.message === 'Order not found' || data.message?.startsWith('Product no longer sold or out of stock: '))) {
    throw new Error(data.message);
  }
  throw new Error('Store database is temporarily unavailable');
}
