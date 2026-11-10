create function public.geargrid_settings_patch(p_patch jsonb)
returns jsonb
language sql security invoker set search_path = '' as $$
  update geargrid.store_settings
  set settings = settings || p_patch
  where singleton
  returning settings;
$$;

revoke execute on function public.geargrid_settings_patch(jsonb) from public, anon, authenticated;
grant execute on function public.geargrid_settings_patch(jsonb) to service_role;
