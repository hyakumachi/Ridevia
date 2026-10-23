begin;
insert into public.cars(id,name,plate_number,daily_rate) values
 ('81000000-0000-0000-0000-000000000001','Payment start test','PAYMENT-START-TEST',1000);
do $$
declare v_group uuid;
begin
 v_group:=(public.submit_booking(array['81000000-0000-0000-0000-000000000001'::uuid],current_date+10,current_date+12,
 'Payment Test','payment-start-test@example.com','09123456789','TEST')->>'group_ref')::uuid;
 if (select status from public.public_cars_by_ids(array['81000000-0000-0000-0000-000000000001'::uuid]))<>'reserved' then raise exception 'Pending car not shown reserved';end if;
 begin
  update public.bookings set payment_status='paid' where group_ref=v_group;
  raise exception 'Accepted payment without method';
 exception when check_violation then null;end;
 if exists(select 1 from public.bookings where group_ref=v_group and status<>'pending') then raise exception 'Failed payment started rental';end if;
 update public.bookings set payment_status='paid',payment_method='cash' where group_ref=v_group;
 if exists(select 1 from public.bookings where group_ref=v_group and status<>'ongoing') then raise exception 'Payment did not start rental';end if;
 if (select status from public.public_cars_by_ids(array['81000000-0000-0000-0000-000000000001'::uuid]))<>'rented' then raise exception 'Paid car not shown on rental';end if;
 if public.check_availability('81000000-0000-0000-0000-000000000001',current_date+100,current_date+101) then raise exception 'Ongoing rental released automatically by date';end if;
 begin
  perform public.submit_booking(array['81000000-0000-0000-0000-000000000001'::uuid],current_date+100,current_date+101,'Later','later-hold@example.com','09123456789','TEST');
  raise exception 'Ongoing rental allowed later booking';
 exception when check_violation then null;end;
 update public.bookings set status='completed' where group_ref=v_group;
 update public.bookings set payment_status='paid' where group_ref=v_group;
 if exists(select 1 from public.bookings where group_ref=v_group and status<>'completed') then raise exception 'Completed rental reopened';end if;
 if (select status from public.public_cars_by_ids(array['81000000-0000-0000-0000-000000000001'::uuid]))<>'available' then raise exception 'Completed car not released';end if;
end $$;
rollback;
