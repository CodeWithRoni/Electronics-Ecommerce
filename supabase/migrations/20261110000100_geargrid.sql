begin;

create schema geargrid;
revoke all on schema geargrid from public, anon, authenticated;
grant usage on schema geargrid to service_role;

create table geargrid.products (
  id text primary key, name text not null, sku text default '', description text default '',
  price numeric not null check (price >= 0), stock integer not null default 0 check (stock >= 0),
  group_id text default '', category_id text default '', brand_id text default '',
  unit text default 'pcs', image text default '', active integer not null default 1,
  created_at timestamptz not null default current_timestamp
);
create table geargrid.orders (
  order_no text primary key, client_ref text not null unique, name text not null,
  phone text not null, address text not null, area text not null,
  note text default '', payment text not null, bkash_sender text default '',
  bkash_trx text default '', payment_status text default 'pending',
  delivery numeric not null, total numeric not null, status text not null default 'new',
  created_at timestamptz not null default current_timestamp
);
create table geargrid.order_items (
  order_no text not null references geargrid.orders(order_no),
  product_id text not null, name text not null, unit text not null,
  qty integer not null, price numeric not null, total numeric not null
);
create table geargrid.order_log (
  order_no text not null, status text not null,
  at timestamptz not null default current_timestamp
);
create index geargrid_items_order_idx on geargrid.order_items (order_no);
create index geargrid_log_order_idx on geargrid.order_log (order_no, at);
create index geargrid_orders_recent_idx on geargrid.orders (created_at desc);

alter table geargrid.products enable row level security;
alter table geargrid.orders enable row level security;
alter table geargrid.order_items enable row level security;
alter table geargrid.order_log enable row level security;
grant select, insert, update on geargrid.products, geargrid.orders to service_role;
grant select, insert on geargrid.order_items, geargrid.order_log to service_role;

create function geargrid.place_order(p jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  order_number text := p->>'order_no';
  delivery_fee numeric := (p->>'delivery')::numeric;
  order_total numeric := delivery_fee;
  line_total numeric;
  prior jsonb;
  item record;
  product geargrid.products%rowtype;
begin
  -- Serialize retries for the same checkout. Product locks are acquired in ID order.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('geargrid:' || (p->>'client_ref'), 0));
  select jsonb_build_object('order_no', o.order_no, 'total', o.total, 'delivery', o.delivery, 'payment', o.payment)
    into prior from geargrid.orders o where o.client_ref = p->>'client_ref';
  if prior is not null then return prior; end if;

  insert into geargrid.orders (order_no, client_ref, name, phone, address, area, note, payment, bkash_sender, bkash_trx, delivery, total)
  values (order_number, p->>'client_ref', p->>'name', p->>'phone', p->>'address',
          p->>'area', p->>'note', p->>'payment', p->>'bkash_sender', p->>'bkash_trx', delivery_fee, delivery_fee);

  for item in select key as id, value::integer as qty from jsonb_each_text(p->'quantities') order by key loop
    update geargrid.products
      set stock = stock - item.qty
      where id = item.id and active = 1 and stock >= item.qty and item.qty > 0
      returning * into product;
    if not found then
      raise exception 'Product no longer sold or out of stock: %', item.id;
    end if;
    line_total := round(product.price * item.qty, 2);
    order_total := order_total + line_total;
    insert into geargrid.order_items (order_no, product_id, name, unit, qty, price, total)
    values (order_number, product.id, product.name, product.unit, item.qty, product.price, line_total);
  end loop;

  order_total := round(order_total, 2);
  update geargrid.orders set total = order_total where order_no = order_number;
  insert into geargrid.order_log (order_no, status) values (order_number, 'new');
  return jsonb_build_object('order_no', order_number, 'total', order_total, 'delivery', delivery_fee, 'payment', p->>'payment');
end;
$$;

create function public.geargrid_data(p_action text, p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  tracked geargrid.orders%rowtype;
begin
  case p_action
    when 'catalog' then
      return (select coalesce(jsonb_agg(p order by p.created_at desc, p.id), '[]'::jsonb)
              from geargrid.products p where p.active = 1);
    when 'place_order' then
      return geargrid.place_order(p_payload);
    when 'track' then
      select * into tracked from geargrid.orders o
        where o.order_no = p_payload->>'order_no' and o.phone = p_payload->>'phone';
      if not found then raise exception 'Order not found'; end if;
      return jsonb_build_object(
        'order_no', tracked.order_no, 'status', tracked.status, 'created_at', tracked.created_at,
        'delivery', tracked.delivery, 'total', tracked.total, 'payment', tracked.payment,
        'payment_status', tracked.payment_status,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'unit', i.unit, 'qty', i.qty, 'total', i.total)), '[]'::jsonb)
                  from geargrid.order_items i where i.order_no = tracked.order_no),
        'log', (select coalesce(jsonb_agg(jsonb_build_object('status', l.status, 'at', l.at) order by l.at), '[]'::jsonb)
                from geargrid.order_log l where l.order_no = tracked.order_no));
    when 'admin_products' then
      return (select coalesce(jsonb_agg(p order by p.created_at desc, p.id), '[]'::jsonb) from geargrid.products p);
    when 'admin_orders' then
      return (select coalesce(jsonb_agg(o order by o.created_at desc, o.order_no), '[]'::jsonb)
              from (select order_no, name, phone, address, area, payment, payment_status, total, status, created_at
                    from geargrid.orders order by created_at desc, order_no limit 200) o);
    when 'upsert_product' then
      insert into geargrid.products (id, name, sku, description, price, stock, group_id, category_id, brand_id, unit, image, active)
      values (p_payload->>'id', p_payload->>'name', p_payload->>'sku', p_payload->>'description',
              (p_payload->>'price')::numeric, (p_payload->>'stock')::integer,
              p_payload->>'group_id', p_payload->>'category_id', p_payload->>'brand_id',
              p_payload->>'unit', p_payload->>'image', (p_payload->>'active')::integer)
      on conflict (id) do update set
        name = excluded.name, sku = excluded.sku, description = excluded.description, price = excluded.price,
        stock = excluded.stock, group_id = excluded.group_id, category_id = excluded.category_id,
        brand_id = excluded.brand_id, unit = excluded.unit, image = excluded.image, active = excluded.active;
      return jsonb_build_object('id', p_payload->>'id');
    when 'update_order_status' then
      update geargrid.orders set status = p_payload->>'status' where order_no = p_payload->>'order_no';
      if not found then raise exception 'Order not found'; end if;
      insert into geargrid.order_log (order_no, status) values (p_payload->>'order_no', p_payload->>'status');
      return p_payload;
    else
      raise exception 'Unknown database operation';
  end case;
end;
$$;

revoke execute on function geargrid.place_order(jsonb) from public, anon, authenticated;
revoke execute on function public.geargrid_data(text, jsonb) from public, anon, authenticated;
grant execute on function geargrid.place_order(jsonb) to service_role;
grant execute on function public.geargrid_data(text, jsonb) to service_role;
commit;
