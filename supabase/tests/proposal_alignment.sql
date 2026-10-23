-- Run with the booking regression suite on a disposable/demo project. All fixtures roll back.
begin;
insert into public.cars(id,name,plate_number,daily_rate,make,model,category)
 values ('60000000-0000-0000-0000-000000000001','Proposal test','PROPOSAL-TEST',1000,'Test','Sedan','sedan');
set local role anon;
do $$
declare v_quote jsonb; v_booking jsonb;
begin
  if not public.check_availability('60000000-0000-0000-0000-000000000001',current_date+90,current_date+97) then
    raise exception 'Free car marked unavailable';
  end if;
  v_quote := public.calculate_price('60000000-0000-0000-0000-000000000001',current_date+90,current_date+97);
  if (v_quote->>'total_price')::numeric<>6300 or (v_quote->>'discount_percent')::int<>10 then
    raise exception 'Named calculator discount failed';
  end if;
  v_booking := public.submit_booking(array['60000000-0000-0000-0000-000000000001'::uuid],current_date+90,current_date+97,
    'Proposal Guest','proposal-test@example.com','09123456789','PROPOSAL-ONLY');
  if (v_booking->>'total_price')::numeric<>(v_quote->>'total_price')::numeric then
    raise exception 'Quote differs from stored booking';
  end if;
  if public.check_availability('60000000-0000-0000-0000-000000000001',current_date+91,current_date+92) then
    raise exception 'Reserved car marked free';
  end if;
  if public.check_availability('60000000-0000-0000-0000-000000000001',current_date+97,current_date+98) then
    raise exception 'Active car was available for later dates';
  end if;
  begin
    perform public.calculate_price('60000000-0000-0000-0000-000000000099',current_date+90,current_date+97);
    raise exception 'Unknown car accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.check_availability('60000000-0000-0000-0000-000000000001',current_date+90,current_date+90);
    raise exception 'Invalid dates accepted';
  exception when invalid_parameter_value then null; end;
  if not exists(select 1 from public.car_catalog() where id='60000000-0000-0000-0000-000000000001' and make='Test' and model='Sedan' and category='sedan' and status='reserved') then
    raise exception 'Catalog proposal fields missing';
  end if;
end;
$$;
reset role;
insert into auth.users(id) values ('60000000-0000-0000-0000-000000000002');
set local request.jwt.claims='{"sub":"60000000-0000-0000-0000-000000000002"}';
set local role authenticated;
do $$
begin
  if public.is_admin() then raise exception 'Non-admin authorized'; end if;
  if exists(select 1 from public.cars) then raise exception 'Non-admin read internal fleet'; end if;
  update public.cars set make='Forbidden' where id='60000000-0000-0000-0000-000000000001';
  if found then raise exception 'Non-admin updated fleet'; end if;
  begin
    insert into public.cars(name,plate_number,daily_rate) values ('Forbidden','FORBIDDEN',1000);
    raise exception 'Non-admin created car';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
insert into private.admins values ('60000000-0000-0000-0000-000000000002');
set local role authenticated;
do $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin denied'; end if;
  insert into public.cars(name,plate_number,daily_rate,make,model,category)
    values ('Admin CRUD','CRUD-TEST',1800,'Test','Van','van') returning id into v_id;
  update public.cars set daily_rate=2000,maintenance=true where id=v_id;
  if not exists(select 1 from public.cars where id=v_id and status='maintenance' and daily_rate=2000) then
    raise exception 'Admin update/status synchronization failed';
  end if;
  delete from public.cars where id=v_id;
  if not found then raise exception 'Admin delete failed'; end if;
  begin
    delete from public.cars where id='60000000-0000-0000-0000-000000000001';
    raise exception 'Car with history deleted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.cars(name,plate_number,daily_rate) values ('NaN','NAN-TEST','NaN');
    raise exception 'Nonfinite rate accepted';
  exception when check_violation then null; end;
end;
$$;
reset role;
rollback;
