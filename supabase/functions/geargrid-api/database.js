export async function supabaseData(url, key, action, payload = {}) {
  return rpc(url, key, 'geargrid_data', { p_action: action, p_payload: payload });
}

export async function rpc(url, key, procedure, parameters) {
  if (!url || !key) throw new Error('Store database is not configured');
  const headers = { 'Content-Type': 'application/json', apikey: key };
  // Supabase's legacy service_role key is a JWT. New sb_secret_ keys use apikey only.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  let response;
  try {
    const endpoint = new URL(`/rest/v1/rpc/${procedure}`, url);
    response = await fetch(endpoint, {
      method: 'POST', headers, body: JSON.stringify(parameters),
    });
  } catch {
    throw new Error('Store database is temporarily unavailable');
  }
  const data = await response.json().catch(() => null);
  if (response.ok && data !== null) return data;
  if (data?.code === 'P0001' && data.message?.startsWith('Console: ')) throw new Error(data.message.slice(9));
  if (data?.code === 'P0001' && (data.message === 'Order not found' || data.message?.startsWith('Product no longer sold or out of stock: '))) {
    throw new Error(data.message);
  }
  throw new Error('Store database is temporarily unavailable');
}
