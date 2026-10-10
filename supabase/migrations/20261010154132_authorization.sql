begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
-- Provision membership only through trusted SQL; API users cannot promote themselves.
create table private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.admins enable row level security;
revoke all on private.admins from public, anon, authenticated;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
create policy cars_admin on public.cars for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy customers_admin on public.customers for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy bookings_admin on public.bookings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- Mutating grants are added only after triggers are installed in stage 3.
commit;
