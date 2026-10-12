begin;
alter table public.cars
  add column make text not null default 'Unspecified' check (length(btrim(make)) between 1 and 80),
  add column model text not null default 'Unspecified' check (length(btrim(model)) between 1 and 80),
  add column category text not null default 'sedan' check (category in ('sedan','suv','van')),
  add column status text generated always as (case when maintenance then 'maintenance' else 'available' end) stored,
  add constraint cars_finite_rate check (daily_rate <> 'NaN'::numeric);
alter table public.bookings
  add column payment_method text check (payment_method in ('cash','card','gcash','other')),
  add constraint bookings_finite_rate check (daily_rate <> 'NaN'::numeric);
-- Backfill known demo inventory; existing custom inventory can be edited by its admin.
update public.cars set make='Toyota', model='Vios', category='sedan' where id='50000000-0000-0000-0000-000000000001';
update public.cars set make='Toyota', model='Innova', category='van' where id='50000000-0000-0000-0000-000000000002';
update public.cars set make='Mitsubishi', model='Montero', category='suv' where id='50000000-0000-0000-0000-000000000003';
update public.cars set make='Honda', model='City', category='sedan' where id='50000000-0000-0000-0000-000000000004';
-- Return-type changes require recreating this read-only RPC; callers retain its original columns.
drop function public.car_catalog();
create function public.car_catalog()
returns table (id uuid,name text,daily_rate numeric,maintenance boolean,make text,model text,category text,status text)
language sql stable security definer set search_path = '' as $$
  select id,name,daily_rate,maintenance,make,model,category,status from public.cars order by name,id;
$$;
revoke all on function public.car_catalog() from public,anon,authenticated;
grant execute on function public.car_catalog() to anon,authenticated;
grant select(make,model,category,status) on public.cars to anon;

create function public.check_availability(p_car_id uuid,p_start_date date,p_end_date date)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_available boolean;
begin
  select available into v_available from public.car_availability(p_start_date,p_end_date) where car_id=p_car_id;
  if not found then raise exception 'Unknown car' using errcode='22023'; end if;
  return v_available;
end;
$$;
create function public.calculate_price(p_car_id uuid,p_start_date date,p_end_date date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_rate numeric; v_days integer; v_discount integer;
begin
  -- Reuse date/car validation; an unavailable car may still receive a price quote.
  perform public.check_availability(p_car_id,p_start_date,p_end_date);
  select daily_rate into v_rate from public.cars where id=p_car_id;
  v_days := p_end_date-p_start_date;
  v_discount := case when v_days >= 7 then 10 else 0 end;
  return jsonb_build_object('car_id',p_car_id,'rental_days',v_days,'daily_rate',v_rate,
    'discount_percent',v_discount,'total_price',round(v_rate*v_days*(100-v_discount)/100,2),'currency','PHP');
end;
$$;
create function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.is_admin(); $$;
revoke all on function public.check_availability(uuid,date,date),public.calculate_price(uuid,date,date),public.is_admin()
  from public,anon,authenticated;
grant execute on function public.check_availability(uuid,date,date),public.calculate_price(uuid,date,date) to anon,authenticated;
grant execute on function public.is_admin() to authenticated;
commit;
