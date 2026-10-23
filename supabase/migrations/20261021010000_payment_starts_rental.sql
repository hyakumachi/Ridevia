begin;
-- Protect the lifecycle even when an administrator updates the table directly.
create or replace function private.validate_booking_lifecycle() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.payment_status <> 'unpaid' or new.payment_method is not null then
      raise exception 'New bookings must be pending and unpaid' using errcode = '23514';
    end if;
  else
    -- Receiving payment starts a pending rental in the same transaction.
    if old.payment_status = 'unpaid' and new.payment_status = 'paid' and new.status = 'pending' then
      new.status := 'ongoing';
    end if;
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
commit;
