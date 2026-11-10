import { createHandler } from './handler.js';
import { rpc, supabaseData } from './database.js';
import { createAdminAuth } from './auth.js';
import { uploadMedia } from './media.js';

const url = Deno.env.get('SUPABASE_URL');
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const key = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const publicKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
const publicKey = publicKeys.default || Deno.env.get('SUPABASE_ANON_KEY');
const configNames = [
  'ALLOWED_ORIGIN', 'SHOP_NAME', 'SHOP_ADDRESS', 'SHOP_PHONE', 'SHOP_EMAIL',
  'BKASH_NUMBER', 'DELIVERY_INSIDE', 'DELIVERY_OUTSIDE', 'DELIVERY_INSIDE_LABEL', 'DATABASE_READ_ONLY',
];
const env = Object.fromEntries(configNames.map((name) => [name, Deno.env.get(name)]));

const auth = createAdminAuth(url, publicKey, key, (params) => rpc(url, key, 'geargrid_admin_lookup', params));
Deno.serve(createHandler(
  env,
  (action, payload) => supabaseData(url, key, action, payload),
  auth,
  (action, payload = {}) => action === 'settings_patch'
    ? rpc(url, key, 'geargrid_settings_patch', { p_patch: payload })
    : rpc(url, key, 'geargrid_console', { p_action: action, p_payload: payload }),
  (file) => uploadMedia(url, key, file),
));
