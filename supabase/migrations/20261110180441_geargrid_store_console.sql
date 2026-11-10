create table geargrid.product_groups (
  id text primary key,
  name text not null
);
create table geargrid.product_categories (
  id text not null,
  group_id text not null references geargrid.product_groups(id),
  name text not null,
  primary key (group_id, id)
);
create table geargrid.product_brands (
  id text primary key,
  name text not null
);
create unique index product_groups_name_idx on geargrid.product_groups (name);
create unique index product_categories_name_idx on geargrid.product_categories (group_id, name);
create unique index product_brands_name_idx on geargrid.product_brands (name);

create table geargrid.store_settings (
  singleton boolean primary key default true check (singleton),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object')
);
insert into geargrid.store_settings default values;

alter table geargrid.product_groups enable row level security;
alter table geargrid.product_categories enable row level security;
alter table geargrid.product_brands enable row level security;
alter table geargrid.store_settings enable row level security;
revoke all on geargrid.product_groups, geargrid.product_categories, geargrid.product_brands, geargrid.store_settings from public, anon, authenticated;
grant select, insert, update, delete on geargrid.product_groups, geargrid.product_categories, geargrid.product_brands to service_role;
grant select, update on geargrid.store_settings to service_role;
grant delete on geargrid.products to service_role;

-- Preserve product references already present when upgrading the catalog.
lock table geargrid.products in share row exclusive mode;
insert into geargrid.product_groups (id, name)
  select distinct group_id, group_id from geargrid.products where nullif(group_id, '') is not null;
insert into geargrid.product_categories (id, group_id, name)
  select distinct category_id, group_id, category_id from geargrid.products
  where nullif(group_id, '') is not null and nullif(category_id, '') is not null;
insert into geargrid.product_brands (id, name)
  select distinct brand_id, brand_id from geargrid.products where nullif(brand_id, '') is not null;

create function geargrid.normalize_product_taxonomy() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.group_id := nullif(new.group_id, '');
  new.category_id := nullif(new.category_id, '');
  new.brand_id := nullif(new.brand_id, '');
  return new;
end;
$$;
create trigger normalize_product_taxonomy before insert or update of group_id, category_id, brand_id
on geargrid.products for each row execute function geargrid.normalize_product_taxonomy();
update geargrid.products set group_id = group_id, category_id = category_id, brand_id = brand_id
where group_id = '' or category_id = '' or brand_id = '';
alter table geargrid.products
  add foreign key (group_id) references geargrid.product_groups(id),
  add foreign key (group_id, category_id) references geargrid.product_categories(group_id, id),
  add foreign key (brand_id) references geargrid.product_brands(id);
create index products_group_category_idx on geargrid.products (group_id, category_id);
create index products_brand_idx on geargrid.products (brand_id);
revoke execute on function geargrid.normalize_product_taxonomy() from public, anon, authenticated;
grant execute on function geargrid.normalize_product_taxonomy() to service_role;

create function public.geargrid_console(p_action text, p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  kind text := p_payload->>'kind';
  item_id text := p_payload->>'id';
  group_key text := p_payload->>'group_id';
  label text := p_payload->>'name';
  old_stock integer;
begin
  case p_action
    when 'snapshot' then
      return jsonb_build_object(
        'settings', (select settings from geargrid.store_settings),
        'groups', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', g.id, 'name', g.name, 'categories', (
            select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::jsonb)
            from geargrid.product_categories c where c.group_id = g.id
          )) order by g.name), '[]'::jsonb) from geargrid.product_groups g),
        'brands', (select coalesce(jsonb_agg(b order by b.name), '[]'::jsonb) from geargrid.product_brands b)
      );
    when 'settings_save' then
      update geargrid.store_settings set settings = p_payload where singleton;
      return p_payload;
    when 'taxonomy_save' then
      case kind
        when 'group' then
          insert into geargrid.product_groups values (item_id, label)
            on conflict (id) do update set name = excluded.name;
        when 'category' then
          insert into geargrid.product_categories values (item_id, group_key, label)
            on conflict (group_id, id) do update set name = excluded.name;
        when 'brand' then
          insert into geargrid.product_brands values (item_id, label)
            on conflict (id) do update set name = excluded.name;
        else raise exception 'Console: Unknown catalog type';
      end case;
      return jsonb_build_object('id', item_id);
    when 'taxonomy_delete' then
      case kind
        when 'group' then delete from geargrid.product_groups where id = item_id;
        when 'category' then delete from geargrid.product_categories where group_id = group_key and id = item_id;
        when 'brand' then delete from geargrid.product_brands where id = item_id;
        else raise exception 'Console: Unknown catalog type';
      end case;
      return jsonb_build_object('id', item_id);
    when 'product_save' then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('geargrid-product:' || item_id, 0));
      select stock into old_stock from geargrid.products where id = item_id for update;
      if coalesce((p_payload->>'create_only')::boolean, false) and found then
        raise exception 'Console: This product ID is already in use';
      end if;
      if p_payload->>'expected_stock' is not null
         and old_stock is distinct from (p_payload->>'expected_stock')::integer then
        raise exception 'Console: Stock changed since you opened this product. Reopen it to see the latest stock';
      end if;
      return public.geargrid_data('upsert_product', p_payload);
    when 'product_delete' then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('geargrid-product:' || item_id, 0));
      delete from geargrid.products where id = item_id;
      return jsonb_build_object('id', item_id);
    else raise exception 'Console: Unknown store operation';
  end case;
exception
  when foreign_key_violation then
    if p_action = 'taxonomy_delete' then
      raise exception 'Console: This entry is still used by a product or category. Reassign those items first';
    end if;
    raise exception 'Console: A selected group, category or brand no longer exists. Refresh and choose it again';
  when unique_violation then
    raise exception 'Console: An entry with this name already exists';
end;
$$;

revoke execute on function public.geargrid_console(text, jsonb) from public, anon, authenticated;
grant execute on function public.geargrid_console(text, jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('geargrid-media', 'geargrid-media', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif','image/x-icon']);
