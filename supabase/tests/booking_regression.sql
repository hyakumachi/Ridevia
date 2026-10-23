-- Run with psql -v ON_ERROR_STOP=1 against a disposable migrated Supabase database.
-- All fixtures are rolled back. No dependency on pgTAP.
begin;
insert into public.cars(id,name,plate_number,daily_rate) values
 ('10000000-0000-0000-0000-000000000001','Test car A','TEST-A',1000),
 ('10000000-0000-0000-0000-000000000002','Test car B','TEST-B',2000);
set local role anon;
do $$
declare r jsonb;
begin
  r := public.submit_booking(array['10000000-0000-0000-0000-000000000001'::uuid],
    current_date+30,current_date+37,'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
  if (r->>'total_price')::numeric <> 6300 or r->>'currency' <> 'PHP' then
    raise exception 'Seven-day pricing failed';
  end if;
  begin
    perform public.submit_booking(array['10000000-0000-0000-0000-000000000001'::uuid],
      current_date+37,current_date+38,'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
    raise exception 'Active car accepted adjacent reservation';
  exception when check_violation then null;end;
  if (public.calculate_price('10000000-0000-0000-0000-000000000001',current_date+37,current_date+38)->>'total_price')::numeric <> 1000 then
    raise exception 'One-day pricing failed';end if;
  begin
    perform public.submit_booking(array['10000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000002'::uuid],current_date+31,current_date+32,
      'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
    raise exception 'Overlap was accepted';
  exception when exclusion_violation or check_violation then null; end;
  begin
    perform public.submit_booking(array['10000000-0000-0000-0000-000000000002'::uuid],
      current_date+40,current_date+40,'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
    raise exception 'Invalid dates were accepted';
  exception when invalid_parameter_value then null; end;
  if exists (select 1 from public.car_catalog() where name='Test car A' and daily_rate<>1000) then
    raise exception 'Catalog pricing wrong';
  end if;
  if (select available from public.car_availability(current_date+30,current_date+37)
      where car_id='10000000-0000-0000-0000-000000000001') then
    raise exception 'Availability exposed a reserved car as free';
  end if;
  if (select available from public.car_availability(current_date+38,current_date+39)
      where car_id='10000000-0000-0000-0000-000000000001') then
    raise exception 'Active car became available for later dates';
  end if;
  begin
    perform plate_number from public.cars;
    raise exception 'Anonymous internal car details exposed';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.customers;
    raise exception 'Anonymous customer access allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.bookings set payment_status='paid';
    raise exception 'Anonymous mutation allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$
begin
  if (select count(*) from public.customers where email='ridevia-sql-regression@example.com') <> 1 then
    raise exception 'Failed submission left a customer behind';
  end if;
  if exists (select 1 from public.bookings where car_id='10000000-0000-0000-0000-000000000002') then
    raise exception 'Failed multi-car submission left a booking behind';
  end if;
  begin
    update public.cars set maintenance=true where plate_number='TEST-A';
    raise exception 'Maintenance allowed with active bookings';
  exception when check_violation then null; end;
end $$;
update public.cars set maintenance=true where plate_number='TEST-B';
set local role anon;
do $$
begin
  begin
    perform public.submit_booking(array['10000000-0000-0000-0000-000000000002'::uuid],
      current_date+40,current_date+41,'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
    raise exception 'Maintenance booking accepted';
  exception when check_violation then null; end;
end $$;
reset role;
-- Fake user metadata must not grant admin rights.
set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000001","user_metadata":{"role":"admin"}}';
set local role authenticated;
do $$
begin
  if private.is_admin() then raise exception 'Unauthorized admin'; end if;
  if exists(select 1 from public.customers) or exists(select 1 from public.bookings) then
    raise exception 'Authenticated non-admin read private records';
  end if;
  begin
    insert into private.admins values ('20000000-0000-0000-0000-000000000001');
    raise exception 'Self-promotion allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into auth.users(id) values ('20000000-0000-0000-0000-000000000001');
insert into private.admins values ('20000000-0000-0000-0000-000000000001');
set local role authenticated;
do $$
begin
  if not private.is_admin() then raise exception 'Provisioned admin denied'; end if;
  if (select count(*) from public.bookings where car_id in
    ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002')) <> 1 then
    raise exception 'Admin cannot read fixture bookings'; end if;
  begin
    update public.bookings set daily_rate=1
      where car_id='10000000-0000-0000-0000-000000000001';
    raise exception 'Quoted price changed';
  exception when check_violation then null; end;
end $$;
reset role;
update public.bookings set status='cancelled' where car_id='10000000-0000-0000-0000-000000000001';
set local role anon;
select public.submit_booking(array['10000000-0000-0000-0000-000000000001'::uuid],
 current_date+30,current_date+37,'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
reset role;
update public.bookings set status='cancelled' where car_id='10000000-0000-0000-0000-000000000001' and status='pending';
update public.cars set maintenance=false where plate_number='TEST-B';
set local role anon;
do $$
declare r jsonb;
begin
  r := public.submit_booking(array['10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid],current_date+50,current_date+56,
    'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
  if (r->>'total_price')::numeric <> 18000 or jsonb_array_length(r->'bookings') <> 2 then
    raise exception 'Six-day multi-car pricing failed';
  end if;
  begin
    perform public.submit_booking(array['10000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000001'::uuid],current_date+60,current_date+61,
      'Test Guest','ridevia-sql-regression@example.com','09123456789','TEST-LICENSE');
    raise exception 'Duplicate cars accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
rollback;
