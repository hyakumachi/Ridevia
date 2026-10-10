begin;
create function public.car_availability(p_start_date date, p_end_date date)
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
        and daterange(b.start_date,b.end_date,'[)') && daterange(p_start_date,p_end_date,'[)')
    ) from public.cars c;
end;
$$;
revoke all on function public.car_availability(date,date) from public, anon, authenticated;
grant execute on function public.car_availability(date,date) to anon, authenticated;
commit;
