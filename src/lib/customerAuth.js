import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_CUSTOMER_SUPABASE_URL || 'https://ohdfalbijnqjcgtlibas.supabase.co';
const publishableKey = import.meta.env.VITE_CUSTOMER_SUPABASE_KEY || 'sb_publishable_rl-9MF3KEYdnm-Xd1z3b1g_kCVg0o7C';

export const customerAuth = createClient(url, publishableKey, {
  auth: { storageKey: 'geargrid_customer_session', persistSession: true, autoRefreshToken: true },
}).auth;

export function accountRedirect(action) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('account', action);
  return url.href;
}
