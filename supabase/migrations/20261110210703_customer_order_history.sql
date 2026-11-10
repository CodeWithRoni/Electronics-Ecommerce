begin;

alter table geargrid.orders add column customer_id uuid references auth.users(id) on delete set null;
create index geargrid_orders_customer_recent_idx
  on geargrid.orders (customer_id, created_at desc, order_no)
  where customer_id is not null;

create function public.geargrid_customer_place_order(p_payload jsonb, p_customer_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  previous_customer uuid;
  placed jsonb;
begin
  -- Match the existing checkout lock so a retry cannot claim another customer's order.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('geargrid:' || (p_payload->>'client_ref'), 0));
  select o.customer_id into previous_customer from geargrid.orders o
    where o.client_ref = p_payload->>'client_ref';
  if found then
    if previous_customer is distinct from p_customer_id then
      raise exception 'Checkout session changed. Use the same account to retry this order.';
    end if;
    return geargrid.place_order(p_payload);
  end if;

  placed := geargrid.place_order(p_payload);
  if p_customer_id is not null then
    update geargrid.orders set customer_id = p_customer_id where order_no = placed->>'order_no';
  end if;
  return placed;
end;
$$;

create function public.geargrid_customer_orders(p_customer_id uuid, p_page integer) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'count', (select count(*) from geargrid.orders where customer_id = p_customer_id),
    'orders', coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc, o.order_no), '[]'::jsonb)
  )
  from (
    select o.order_no, o.status, o.created_at, o.delivery, o.total, o.payment, o.payment_status,
      (select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', i.product_id, 'name', i.name, 'qty', i.qty, 'price', i.price, 'total', i.total
      ) order by i.name, i.product_id), '[]'::jsonb) from geargrid.order_items i where i.order_no = o.order_no) as items
    from geargrid.orders o where o.customer_id = p_customer_id
    order by o.created_at desc, o.order_no
    limit 20 offset (greatest(p_page, 0)::bigint * 20)
  ) o;
$$;

revoke execute on function public.geargrid_customer_place_order(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.geargrid_customer_orders(uuid, integer) from public, anon, authenticated;
grant execute on function public.geargrid_customer_place_order(jsonb, uuid) to service_role;
grant execute on function public.geargrid_customer_orders(uuid, integer) to service_role;

commit;
