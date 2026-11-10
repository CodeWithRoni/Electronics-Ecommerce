create table geargrid.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80)
);
create unique index attributes_name_idx on geargrid.attributes (lower(name));

create table geargrid.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references geargrid.attributes(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80)
);
create unique index attribute_values_name_idx on geargrid.attribute_values (attribute_id, lower(name));

create table geargrid.product_attribute_values (
  product_id text not null references geargrid.products(id) on delete cascade,
  value_id uuid not null references geargrid.attribute_values(id) on delete restrict,
  primary key (product_id, value_id)
);
create index product_attribute_values_value_idx on geargrid.product_attribute_values (value_id, product_id);

alter table geargrid.attributes enable row level security;
alter table geargrid.attribute_values enable row level security;
alter table geargrid.product_attribute_values enable row level security;
grant select, insert, update, delete on geargrid.attributes, geargrid.attribute_values to service_role;
grant select, insert, delete on geargrid.product_attribute_values to service_role;

create function public.geargrid_attributes()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'name', a.name,
    'values', coalesce(v.items, '[]'::jsonb)
  ) order by a.name, a.id), '[]'::jsonb)
  from geargrid.attributes a
  left join (
    select attribute_id, jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name, id) as items
    from geargrid.attribute_values group by attribute_id
  ) v on v.attribute_id = a.id;
$$;

create function public.geargrid_products_with_attributes(p_active_only boolean)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
    'attribute_value_ids', coalesce(v.ids, '[]'::jsonb)
  ) order by p.created_at desc, p.id), '[]'::jsonb)
  from geargrid.products p
  left join (
    select product_id, jsonb_agg(value_id order by value_id) as ids
    from geargrid.product_attribute_values group by product_id
  ) v on v.product_id = p.id
  where not p_active_only or p.active = 1;
$$;

create function public.geargrid_attribute_manage(p_action text, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item_id uuid := nullif(p_payload->>'id', '')::uuid;
  parent_id uuid := nullif(p_payload->>'attribute_id', '')::uuid;
  label text := btrim(coalesce(p_payload->>'name', ''));
begin
  if p_action in ('attribute_save', 'attribute_value_save') and (
    jsonb_typeof(p_payload->'name') is distinct from 'string' or char_length(label) not between 1 and 80
  ) then
    raise exception 'Console: Enter a name of 1 to 80 characters';
  end if;
  case p_action
    when 'attribute_save' then
      if item_id is null then
        insert into geargrid.attributes (name) values (label) returning id into item_id;
      else
        update geargrid.attributes set name = label where id = item_id;
      end if;
    when 'attribute_value_save' then
      if item_id is null then
        if parent_id is null then raise exception 'Console: Choose an attribute'; end if;
        insert into geargrid.attribute_values (attribute_id, name) values (parent_id, label) returning id into item_id;
      else
        update geargrid.attribute_values set name = label where id = item_id and attribute_id = parent_id;
      end if;
    when 'attribute_delete' then
      delete from geargrid.attributes where id = item_id;
    when 'attribute_value_delete' then
      delete from geargrid.attribute_values where id = item_id and attribute_id = parent_id;
    else raise exception 'Console: Unknown attribute operation';
  end case;
  if not found then raise exception 'Console: This attribute or option no longer exists. Refresh and try again'; end if;
  return jsonb_build_object('id', item_id);
exception
  when unique_violation then
    raise exception 'Console: This name already exists';
  when foreign_key_violation then
    if p_action in ('attribute_delete', 'attribute_value_delete') then
      raise exception 'Console: This option is used by a product. Deselect it on those products before deleting';
    end if;
    raise exception 'Console: The selected attribute no longer exists. Refresh and try again';
  when invalid_text_representation then
    raise exception 'Console: Invalid attribute or option ID';
end;
$$;

create or replace function public.geargrid_product_details_save(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  result jsonb;
  values_json jsonb := p_payload->'attribute_value_ids';
  product_key text := p_payload->>'id';
begin
  if p_payload ? 'attribute_value_ids' then
    if jsonb_typeof(values_json) is distinct from 'array' then
      raise exception 'Console: Choose valid product attribute options';
    end if;
    if jsonb_array_length(values_json) > 200 or exists (
      select 1 from jsonb_array_elements(values_json) as v
      where jsonb_typeof(v) is distinct from 'string'
    ) then
      raise exception 'Console: Choose up to 200 valid product attribute options';
    end if;
  end if;

  result := public.geargrid_console('product_save', p_payload);
  update geargrid.products
  set pc_specs = case when p_payload ? 'pc_specs' then p_payload->'pc_specs' else pc_specs end,
      compare_at_price = case when p_payload ? 'compare_at_price'
        then (p_payload->>'compare_at_price')::numeric else compare_at_price end
  where id = product_key;

  if p_payload ? 'attribute_value_ids' then
    delete from geargrid.product_attribute_values where product_id = product_key;
    insert into geargrid.product_attribute_values (product_id, value_id)
      select distinct product_key, value::uuid from jsonb_array_elements_text(values_json);
  end if;
  return result;
exception
  when foreign_key_violation or invalid_text_representation then
    raise exception 'Console: An attribute option is invalid or no longer exists. Refresh and choose it again';
end;
$$;

revoke execute on function public.geargrid_attributes(), public.geargrid_products_with_attributes(boolean),
  public.geargrid_attribute_manage(text, jsonb), public.geargrid_product_details_save(jsonb) from public, anon, authenticated;
grant execute on function public.geargrid_attributes(), public.geargrid_products_with_attributes(boolean),
  public.geargrid_attribute_manage(text, jsonb), public.geargrid_product_details_save(jsonb) to service_role;
