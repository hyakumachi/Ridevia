begin;
-- Protect the lifecycle even when an administrator updates the table directly.
create function private.validate_booking_lifecycle() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.payment_status <> 'unpaid' or new.payment_method is not null then
      raise exception 'New bookings must be pending and unpaid' using errcode = '23514';
    end if;
  else
    if new.status is distinct from old.status and not (
      (old.status = 'pending' and new.status in ('ongoing','cancelled')) or
      (old.status = 'ongoing' and new.status in ('completed','cancelled'))
    ) then
      raise exception 'Invalid booking status transition' using errcode = '23514';
    end if;
    if new.payment_status is distinct from old.payment_status and not (
      (old.payment_status = 'unpaid' and new.payment_status = 'paid' and new.status <> 'cancelled') or
      (old.payment_status = 'paid' and new.payment_status = 'refunded' and new.status = 'cancelled')
    ) then
      raise exception 'Invalid payment transition; refunds require cancellation' using errcode = '23514';
    end if;
    if old.payment_status <> 'unpaid' and new.payment_method is distinct from old.payment_method then
      raise exception 'Recorded payment method is immutable' using errcode = '23514';
    end if;
  end if;
  if (new.payment_status = 'unpaid' and new.payment_method is not null) or
     (new.payment_status <> 'unpaid' and new.payment_method is null) then
    raise exception 'A recorded payment requires a payment method' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_booking_lifecycle before insert or update on public.bookings
for each row execute function private.validate_booking_lifecycle();
revoke all on function private.validate_booking_lifecycle() from public, anon, authenticated;

create function public.update_booking_group(
  p_group_ref uuid, p_status text default null,
  p_payment_status text default null, p_payment_method text default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_group_ref is null or (p_status is null and p_payment_status is null) or
     (p_status is not null and p_status not in ('ongoing','completed','cancelled')) or
     (p_payment_status is not null and p_payment_status not in ('paid','refunded')) or
     (p_payment_method is not null and p_payment_method not in ('cash','card','gcash','other')) or
     (p_payment_method is not null and p_payment_status is distinct from 'paid') or
     (p_payment_status = 'paid' and p_payment_method is null) then
    raise exception 'Invalid group action' using errcode = '22023';
  end if;
  -- Use the same car-lock order as anonymous submission before touching booking rows.
  perform c.id from public.cars c where c.id in (
    select b.car_id from public.bookings b where b.group_ref = p_group_ref
  ) order by c.id for update;
  perform id from public.bookings where group_ref = p_group_ref order by id for update;
  if not found then raise exception 'Booking group not found' using errcode = '22023'; end if;
  update public.bookings set
    status = coalesce(p_status,status),
    payment_status = coalesce(p_payment_status,payment_status),
    payment_method = coalesce(p_payment_method,payment_method)
  where group_ref = p_group_ref;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.update_booking_group(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.update_booking_group(uuid,text,text,text) to authenticated;
create index bookings_group_ref_idx on public.bookings(group_ref);
commit;
