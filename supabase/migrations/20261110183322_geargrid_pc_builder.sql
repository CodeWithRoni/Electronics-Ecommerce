alter table geargrid.products
  add column pc_specs jsonb not null default '{}'::jsonb check (jsonb_typeof(pc_specs) = 'object'),
  add column compare_at_price numeric check (compare_at_price > 0);

create function public.geargrid_product_details_save(p_payload jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  result jsonb;
begin
  result := public.geargrid_console('product_save', p_payload);
  update geargrid.products
  set pc_specs = case when p_payload ? 'pc_specs' then p_payload->'pc_specs' else pc_specs end,
      compare_at_price = case when p_payload ? 'compare_at_price'
        then (p_payload->>'compare_at_price')::numeric else compare_at_price end
  where id = p_payload->>'id';
  return result;
end;
$$;

revoke execute on function public.geargrid_product_details_save(jsonb) from public, anon, authenticated;
grant execute on function public.geargrid_product_details_save(jsonb) to service_role;
