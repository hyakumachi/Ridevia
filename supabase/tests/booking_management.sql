-- Disposable fixtures and all assertions roll back.
begin;
insert into public.cars(id,name,plate_number,daily_rate) values
 ('70000000-0000-0000-0000-000000000001','Lifecycle A','LIFECYCLE-A',1000),
 ('70000000-0000-0000-0000-000000000002','Lifecycle B','LIFECYCLE-B',1500);
insert into auth.users(id) values ('70000000-0000-0000-0000-000000000003');
create temporary table lifecycle_group(ref uuid);
insert into lifecycle_group select (public.submit_booking(
 array['70000000-0000-0000-0000-000000000001'::uuid,'70000000-0000-0000-0000-000000000002'::uuid],
 current_date+120,current_date+127,'Lifecycle Guest','lifecycle@example.com','09123456789','LIFECYCLE'
 )->>'group_ref')::uuid;
grant select on lifecycle_group to authenticated;
set local role anon;
do $$ begin
  begin
    perform public.update_booking_group('70000000-0000-0000-0000-000000000099','ongoing');
    raise exception 'Anonymous group action accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local request.jwt.claims='{"sub":"70000000-0000-0000-0000-000000000003"}';
set local role authenticated;
do $$ begin
  if exists(select 1 from public.bookings) or exists(select 1 from public.customers) then
    raise exception 'Non-admin sees private data';
  end if;
  begin
    perform public.update_booking_group((select ref from lifecycle_group),'ongoing');
    raise exception 'Non-admin group action accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into private.admins values ('70000000-0000-0000-0000-000000000003');
set local role authenticated;
do $$
declare v_group uuid := (select ref from lifecycle_group); v_count integer;
begin
  if (select sum(total_price) from public.bookings where group_ref=v_group) <> 15750 then
    raise exception 'Group price mismatch'; end if;
  begin
    perform public.update_booking_group(v_group,'completed');
    raise exception 'Pending skipped to completed';
  exception when check_violation then null; end;
  begin
    update public.bookings set status='completed' where group_ref=v_group;
    raise exception 'Direct status bypass accepted';
  exception when check_violation then null; end;
  begin
    update public.bookings set payment_status='paid' where group_ref=v_group;
    raise exception 'Paid without method accepted';
  exception when check_violation then null; end;
  begin
    perform public.update_booking_group(v_group,null,'refunded');
    raise exception 'Unpaid refunded';
  exception when check_violation then null; end;
  -- A mixed group must not be partly changed if one member rejects the action.
  update public.bookings set status='ongoing' where group_ref=v_group and car_id='70000000-0000-0000-0000-000000000001';
  begin
    perform public.update_booking_group(v_group,'completed');
    raise exception 'Mixed group partially completed';
  exception when check_violation then null; end;
  if (select count(*) from public.bookings where group_ref=v_group and status='ongoing') <> 1 or
     (select count(*) from public.bookings where group_ref=v_group and status='pending') <> 1 then
    raise exception 'Group failure did not roll back'; end if;
  v_count := public.update_booking_group(v_group,'ongoing');
  if v_count <> 2 then raise exception 'Wrong group count'; end if;
  perform public.update_booking_group(v_group,null,'paid','cash');
  if exists(select 1 from public.bookings where group_ref=v_group and (payment_status<>'paid' or payment_method<>'cash')) then
    raise exception 'Group manual payment failed'; end if;
  begin
    update public.bookings set payment_method='card' where group_ref=v_group;
    raise exception 'Payment method rewritten';
  exception when check_violation then null; end;
  begin
    perform public.update_booking_group(v_group,null,'refunded');
    raise exception 'Active rental refunded';
  exception when check_violation then null; end;
  perform public.update_booking_group(v_group,'completed');
  if exists(select 1 from public.bookings where group_ref=v_group and status<>'completed') then
    raise exception 'Group completion failed'; end if;
  begin
    perform public.update_booking_group(v_group,'ongoing');
    raise exception 'Completed reopened';
  exception when check_violation then null; end;
  if not public.check_availability('70000000-0000-0000-0000-000000000001',current_date+120,current_date+127) then
    raise exception 'Completion failed to release availability'; end if;
end $$;
reset role;
truncate lifecycle_group;
insert into lifecycle_group select (public.submit_booking(
 array['70000000-0000-0000-0000-000000000001'::uuid,'70000000-0000-0000-0000-000000000002'::uuid],
 current_date+120,current_date+127,'Cancel Guest','cancel@example.com','09123456789','CANCEL'
 )->>'group_ref')::uuid;
set local role authenticated;
do $$
declare v_group uuid := (select ref from lifecycle_group);
begin
  perform public.update_booking_group(v_group,null,'paid','gcash');
  perform public.update_booking_group(v_group,'cancelled');
  perform public.update_booking_group(v_group,null,'refunded');
  if exists(select 1 from public.bookings where group_ref=v_group and (status<>'cancelled' or payment_status<>'refunded' or payment_method<>'gcash')) then
    raise exception 'Cancellation/refund failed'; end if;
  begin
    perform public.update_booking_group(v_group,'ongoing');
    raise exception 'Cancelled reopened';
  exception when check_violation then null; end;
  begin
    perform public.update_booking_group(v_group,null,'paid','gcash');
    raise exception 'Refunded reset to paid';
  exception when check_violation then null; end;
  begin
    perform public.update_booking_group('70000000-0000-0000-0000-000000000099','ongoing');
    raise exception 'Missing group accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
rollback;
