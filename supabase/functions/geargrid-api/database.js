export async function supabaseData(url, key, action, payload = {}) {
  if (!url || !key) throw new Error('Store database is not configured');
  const headers = { 'Content-Type': 'application/json', apikey: key };
  // Supabase's legacy service_role key is a JWT. New sb_secret_ keys use apikey only.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  let response;
  try {
    const endpoint = new URL('/rest/v1/rpc/geargrid_data', url);
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
