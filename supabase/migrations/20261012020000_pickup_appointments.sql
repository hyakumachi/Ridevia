begin;
create table public.pickup_appointments (
  invitee_uri text primary key,
  group_ref uuid not null,
  event_uri text not null,
  pickup_at timestamptz not null,
  invitee_created_at timestamptz not null,
  status text not null check (status in ('scheduled','cancelled','needs_review')),
  review_reason text,
  received_at timestamptz not null default now()
);
create index pickup_appointments_group_idx on public.pickup_appointments(group_ref);
alter table public.pickup_appointments enable row level security;
revoke all on public.pickup_appointments from public,anon,authenticated,service_role;
grant select on public.pickup_appointments to authenticated;
grant all on public.pickup_appointments to service_role;
create policy pickups_admin_read on public.pickup_appointments for select to authenticated
using ((select private.is_admin()));
create function public.handle_calendly_webhook(
 p_group_ref uuid,p_invitee_uri text,p_event_uri text,p_email text,
 p_pickup_at timestamptz,p_created_at timestamptz,p_cancelled boolean
) returns text language plpgsql security definer set search_path='' as $$
declare v_reason text; v_existing public.pickup_appointments%rowtype;
begin
 if p_group_ref is null or p_pickup_at is null or not isfinite(p_pickup_at) or
    p_created_at is null or not isfinite(p_created_at) or p_cancelled is null or p_email is null or
    p_event_uri !~ '^https://api[.]calendly[.]com/scheduled_events/[0-9a-f-]{36}$' or
    p_invitee_uri is null or p_event_uri is null or
    p_invitee_uri !~ ('^' || replace(p_event_uri,'.','[.]') || '/invitees/[0-9a-f-]{36}$') then
   raise exception 'Invalid appointment' using errcode='22023';
 end if;
 -- Group row locks serialize callbacks and admin lifecycle changes.
 perform id from public.bookings where group_ref=p_group_ref order by id for update;
 if not found then return 'unknown_group'; end if;
 select * into v_existing from public.pickup_appointments where invitee_uri=p_invitee_uri;
 if found and v_existing.group_ref <> p_group_ref then return 'reference_mismatch'; end if;
 if exists(select 1 from public.bookings b join public.customers c on c.id=b.customer_id
   where b.group_ref=p_group_ref and lower(btrim(c.email))<>lower(btrim(p_email))) then
   v_reason := 'Guest email does not match the rental';
 elsif exists(select 1 from public.bookings where group_ref=p_group_ref and
   start_date<>(p_pickup_at at time zone 'Asia/Manila')::date) then
   v_reason := 'Pickup date does not match the rental start date';
 elsif exists(select 1 from public.bookings where group_ref=p_group_ref and status in ('completed','cancelled')) then
   v_reason := 'Rental is already completed or cancelled';
 end if;
 insert into public.pickup_appointments(invitee_uri,group_ref,event_uri,pickup_at,invitee_created_at,status,review_reason)
 values(p_invitee_uri,p_group_ref,p_event_uri,p_pickup_at,p_created_at,
   case when p_cancelled then 'cancelled' when v_reason is not null then 'needs_review' else 'scheduled' end,v_reason)
 on conflict(invitee_uri) do update set
   status=case when pickup_appointments.status='cancelled' or p_cancelled then 'cancelled' else excluded.status end,
   review_reason=excluded.review_reason,received_at=now()
 where pickup_appointments.group_ref=excluded.group_ref;
 -- Appointment changes never imply rental cancellation, payment or refunds.
 return 'processed';
end;
$$;
revoke all on function public.handle_calendly_webhook(uuid,text,text,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.handle_calendly_webhook(uuid,text,text,text,timestamptz,timestamptz,boolean) to service_role;
commit;
