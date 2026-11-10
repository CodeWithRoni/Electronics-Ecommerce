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
  'BKASH_NUMBER', 'DELIVERY_INSIDE', 'DELIVERY_OUTSIDE', 'DELIVERY_INSIDE_LABEL', 'DATABASE_READ_ONLY', 'GEARGRID_AUTH_CONFIG_TOKEN',
];
const env = Object.fromEntries(configNames.map((name) => [name, Deno.env.get(name)]));
env.SUPABASE_PROJECT_REF = url ? new URL(url).hostname.split('.')[0] : '';

const auth = createAdminAuth(url, publicKey, key, (params) => rpc(url, key, 'geargrid_admin_lookup', params));
Deno.serve(createHandler(
  env,
  (action, payload, customerId) => {
    if (action === 'catalog' || action === 'admin_products')
      return rpc(url, key, 'geargrid_products_with_attributes', { p_active_only: action === 'catalog' });
    if (action === 'place_order')
      return rpc(url, key, 'geargrid_customer_place_order', { p_payload: payload, p_customer_id: customerId });
    if (action === 'customer_orders') return rpc(url, key, 'geargrid_customer_orders', payload);
    return supabaseData(url, key, action, payload);
  },
  auth,
  (action, payload = {}) => {
    if (action === 'settings_patch') return rpc(url, key, 'geargrid_settings_patch', { p_patch: payload });
    if (action === 'product_save') return rpc(url, key, 'geargrid_product_details_save', { p_payload: payload });
    if (action.startsWith('attribute_')) return rpc(url, key, 'geargrid_attribute_manage', { p_action: action, p_payload: payload });
    if (action === 'snapshot') return Promise.all([
      rpc(url, key, 'geargrid_console', { p_action: action, p_payload: payload }),
      rpc(url, key, 'geargrid_attributes', {}),
    ]).then(([snapshot, attributes]) => ({ ...snapshot, attributes }));
    if (action === 'taxonomy_import') return rpc(url, key, 'geargrid_taxonomy_import', { p_kind: payload.kind, p_rows: payload.rows });
    return rpc(url, key, 'geargrid_console', { p_action: action, p_payload: payload });
  },
  (file) => uploadMedia(url, key, file),
));
