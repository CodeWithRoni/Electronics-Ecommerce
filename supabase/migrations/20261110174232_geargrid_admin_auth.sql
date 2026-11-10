create table geargrid.admin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$')
);

alter table geargrid.admin_accounts enable row level security;
revoke all on geargrid.admin_accounts from public, anon, authenticated;
grant select on geargrid.admin_accounts to service_role;

create function public.geargrid_admin_lookup(p_username text default null, p_user_id uuid default null)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select case when p_user_id is not null then
    jsonb_build_object('allowed', exists (
      select 1 from geargrid.admin_accounts where user_id = p_user_id
    ))
  else
    jsonb_build_object('user_id', (
      select user_id from geargrid.admin_accounts where username = p_username
    ))
  end;
$$;

revoke execute on function public.geargrid_admin_lookup(text, uuid) from public, anon, authenticated;
grant execute on function public.geargrid_admin_lookup(text, uuid) to service_role;
