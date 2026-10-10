begin;
create function private.validate_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_car public.cars%rowtype;
begin
  select * into v_car from public.cars where id = new.car_id for update;
  if not found then raise exception 'Unknown car' using errcode = '23503'; end if;
  if new.status in ('pending','ongoing') and v_car.maintenance then
    raise exception 'Car is under maintenance' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if new.start_date < (current_timestamp at time zone 'Asia/Manila')::date then
      raise exception 'Start date must not be in the past' using errcode = '23514';
    end if;
    new.daily_rate := v_car.daily_rate;
  else
    -- Keep the quoted price and group identity immutable; reschedule by cancellation/rebooking.
    if (new.car_id, new.customer_id, new.group_ref, new.start_date, new.end_date, new.daily_rate)
       is distinct from (old.car_id, old.customer_id, old.group_ref, old.start_date, old.end_date, old.daily_rate) then
      raise exception 'Booking details are immutable; cancel and rebook' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger validate_booking before insert or update on public.bookings
  for each row execute function private.validate_booking();
create function private.validate_maintenance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.maintenance and not old.maintenance and exists (
    select 1 from public.bookings where car_id = new.id and status in ('pending','ongoing')
  ) then
    raise exception 'Cancel or complete active bookings before maintenance' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_maintenance before update on public.cars
  for each row execute function private.validate_maintenance();

create function public.submit_booking(
  p_car_ids uuid[], p_start_date date, p_end_date date,
  p_full_name text, p_email text, p_phone text, p_license_number text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_group uuid := gen_random_uuid();
  v_customer uuid;
  v_count integer;
  v_result jsonb;
begin
  if p_car_ids is null or cardinality(p_car_ids) = 0 or cardinality(p_car_ids) > 20
     or array_position(p_car_ids, null) is not null
     or cardinality(p_car_ids) <> (select count(distinct id) from unnest(p_car_ids) id) then
    raise exception 'Select 1 to 20 distinct cars' using errcode = '22023';
  end if;
  if p_start_date is null or p_end_date is null or not isfinite(p_start_date) or not isfinite(p_end_date)
     or p_end_date <= p_start_date
     or p_start_date < (current_timestamp at time zone 'Asia/Manila')::date then
    raise exception 'Invalid rental dates' using errcode = '22023';
  end if;
  -- Consistent lock order makes multi-car submissions atomic without lock-order deadlocks.
  perform id from public.cars where id = any(p_car_ids) order by id for update;
  select count(*) into v_count from public.cars where id = any(p_car_ids);
  if v_count <> cardinality(p_car_ids) then
    raise exception 'Unknown car' using errcode = '22023';
  end if;
  insert into public.customers(full_name,email,phone,license_number)
    values (btrim(p_full_name),lower(btrim(p_email)),btrim(p_phone),btrim(p_license_number))
    returning id into v_customer;
  insert into public.bookings(group_ref,customer_id,car_id,start_date,end_date,daily_rate)
    select v_group,v_customer,id,p_start_date,p_end_date,daily_rate
    from public.cars where id = any(p_car_ids) order by id;
  select jsonb_build_object('group_ref',v_group,'currency','PHP','total_price',sum(total_price),
    'bookings',jsonb_agg(jsonb_build_object('id',id,'car_id',car_id,'rental_days',rental_days,
      'daily_rate',daily_rate,'discount_percent',discount_percent,'total_price',total_price,'status',status)
      order by car_id)) into v_result from public.bookings where group_ref = v_group;
  return v_result;
end;
$$;
revoke all on function private.validate_booking(), private.validate_maintenance() from public, anon, authenticated;
revoke all on function public.submit_booking(uuid[],date,date,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_booking(uuid[],date,date,text,text,text,text) to anon, authenticated;
grant select, insert, update, delete on public.cars, public.customers, public.bookings to authenticated;
-- Public catalog excludes internal identifiers such as plate numbers.
grant select (id,name,daily_rate,maintenance) on public.cars to anon;
create policy cars_catalog on public.cars for select to anon using (true);
create function public.car_catalog()
returns table (id uuid, name text, daily_rate numeric, maintenance boolean)
language sql stable security definer set search_path = '' as $$
  select id, name, daily_rate, maintenance from public.cars order by name, id;
$$;
revoke all on function public.car_catalog() from public, anon, authenticated;
grant execute on function public.car_catalog() to anon, authenticated;
grant select, insert, update, delete on public.cars, public.customers, public.bookings to service_role;
commit;
