begin;
-- Physical fleet rule: an active reservation holds the whole car until released.
create function private.block_active_car_booking() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform id from public.cars where id=new.car_id for update;
 if exists(select 1 from public.bookings where car_id=new.car_id and status in ('pending','ongoing')) then
  raise exception 'Car already has an active reservation; complete or cancel it first' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.block_active_car_booking() from public,anon,authenticated;
create trigger block_active_car_booking before insert on public.bookings
 for each row execute function private.block_active_car_booking();
create or replace function public.car_availability(p_start_date date, p_end_date date)
returns table (car_id uuid, available boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_start_date is null or p_end_date is null or not isfinite(p_start_date) or not isfinite(p_end_date)
     or p_end_date <= p_start_date or p_start_date < (current_timestamp at time zone 'Asia/Manila')::date then
    raise exception 'Invalid rental dates' using errcode = '22023';
  end if;
  return query
    select c.id, not c.maintenance and not exists (
      select 1 from public.bookings b where b.car_id=c.id and b.status in ('pending','ongoing')
    ) from public.cars c;
end;
$$;
create or replace function public.car_availability_for_ids(p_ids uuid[],p_start_date date,p_end_date date)
returns table(car_id uuid,available boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_ids is null or cardinality(p_ids) not between 1 and 32 or array_position(p_ids,null) is not null or
    p_start_date is null or p_end_date is null or not isfinite(p_start_date) or not isfinite(p_end_date) or
    p_end_date<=p_start_date or p_start_date<(current_timestamp at time zone 'Asia/Manila')::date then
  raise exception 'Invalid availability request' using errcode='22023';end if;
 return query select c.id,not c.maintenance and not exists(select 1 from public.bookings b where b.car_id=c.id and b.status in ('pending','ongoing'))
 from public.cars c where c.id=any(p_ids);
end;
$$;
commit;
