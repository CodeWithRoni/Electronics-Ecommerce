create function public.geargrid_taxonomy_import(p_kind text, p_rows jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  item_name text;
  parent_name text;
  parent_id text;
  written integer;
  added integer := 0;
begin
  if p_kind is null or p_kind not in ('group', 'category', 'brand')
     or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Console: Invalid catalog import';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'Console: Import between 1 and 500 rows at a time';
  end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    item_name := btrim(item->>'name');
    if jsonb_typeof(item->'name') is distinct from 'string' or char_length(item_name) not between 1 and 100 then
      raise exception 'Console: Each name must contain 1 to 100 characters';
    end if;

    case p_kind
      when 'group' then
        insert into geargrid.product_groups (id, name)
        values (gen_random_uuid()::text, item_name) on conflict (name) do nothing;
      when 'brand' then
        insert into geargrid.product_brands (id, name)
        values (gen_random_uuid()::text, item_name) on conflict (name) do nothing;
      when 'category' then
        parent_name := btrim(item->>'group_name');
        if jsonb_typeof(item->'group_name') is distinct from 'string' or char_length(parent_name) not between 1 and 100 then
          raise exception 'Console: Each subcategory needs a parent category name';
        end if;
        select id into parent_id from geargrid.product_groups where name = parent_name;
        if not found then
          raise exception 'Console: Parent category "%" was not found', parent_name;
        end if;
        insert into geargrid.product_categories (id, group_id, name)
        values (gen_random_uuid()::text, parent_id, item_name) on conflict (group_id, name) do nothing;
    end case;
    get diagnostics written = row_count;
    added := added + written;
  end loop;

  return jsonb_build_object('added', added, 'skipped', jsonb_array_length(p_rows) - added);
exception
  when foreign_key_violation then
    raise exception 'Console: A parent category changed during import. Refresh and try again';
end;
$$;

revoke execute on function public.geargrid_taxonomy_import(text, jsonb) from public, anon, authenticated;
grant execute on function public.geargrid_taxonomy_import(text, jsonb) to service_role;
