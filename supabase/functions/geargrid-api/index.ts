import { createHandler } from './handler.js';
import { supabaseData } from './database.js';

const url = Deno.env.get('SUPABASE_URL');
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const key = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const configNames = [
  'ADMIN_TOKEN', 'ALLOWED_ORIGIN', 'SHOP_NAME', 'SHOP_ADDRESS', 'SHOP_PHONE', 'SHOP_EMAIL',
  'BKASH_NUMBER', 'DELIVERY_INSIDE', 'DELIVERY_OUTSIDE', 'DELIVERY_INSIDE_LABEL', 'DATABASE_READ_ONLY',
];
const env = Object.fromEntries(configNames.map((name) => [name, Deno.env.get(name)]));

Deno.serve(createHandler(env, (action, payload) => supabaseData(url, key, action, payload)));
