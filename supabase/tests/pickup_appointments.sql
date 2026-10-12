begin;
insert into public.cars(id,name,plate_number,daily_rate) values ('90000000-0000-0000-0000-000000000001','Pickup Test','PICKUP-TEST',1000);
insert into public.customers(id,full_name,email,phone,license_number) values ('90000000-0000-0000-0000-000000000002','Pickup Guest','pickup@example.com','09123456789','PICKUP');
insert into public.bookings(group_ref,customer_id,car_id,start_date,end_date,daily_rate) values ('90000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001',current_date+90,current_date+97,1000);
set local role service_role;
do $$
declare g uuid:='90000000-0000-0000-0000-000000000003'; e text:='https://api.calendly.com/scheduled_events/90000000-0000-0000-0000-000000000004'; i text:=e||'/invitees/90000000-0000-0000-0000-000000000005'; t timestamptz:=((current_date+90)::timestamp+time '09:00') at time zone 'Asia/Manila';
begin
 perform public.handle_calendly_webhook(g,i,e,'pickup@example.com',t,now(),false);
 perform public.handle_calendly_webhook(g,i,e,'pickup@example.com',t,now(),false);
 if (select count(*) from public.pickup_appointments where group_ref=g)<>1 then raise exception 'Duplicate callback duplicated row'; end if;
 if not exists(select 1 from public.pickup_appointments where invitee_uri=i and status='scheduled') then raise exception 'Valid appointment not scheduled'; end if;
 perform public.handle_calendly_webhook(g,i,e,'pickup@example.com',t,now(),true);
 perform public.handle_calendly_webhook(g,i,e,'pickup@example.com',t,now(),false);
 if not exists(select 1 from public.pickup_appointments where invitee_uri=i and status='cancelled') then raise exception 'Late creation resurrected cancellation'; end if;
 i:=e||'/invitees/90000000-0000-0000-0000-000000000006';
 perform public.handle_calendly_webhook(g,i,e,'pickup@example.com',t+interval '1 day',now(),false);
 if not exists(select 1 from public.pickup_appointments where invitee_uri=i and status='needs_review' and review_reason like 'Pickup date%') then raise exception 'Wrong pickup date accepted'; end if;
 i:=e||'/invitees/90000000-0000-0000-0000-000000000007';
 perform public.handle_calendly_webhook(g,i,e,'other@example.com',t,now(),false);
 if not exists(select 1 from public.pickup_appointments where invitee_uri=i and status='needs_review' and review_reason like 'Guest email%') then raise exception 'Wrong guest accepted'; end if;
 if exists(select 1 from public.bookings where group_ref=g and (status<>'pending' or payment_status<>'unpaid')) then raise exception 'Appointment changed rental/payment state'; end if;
 if public.handle_calendly_webhook('90000000-0000-0000-0000-000000000099',i,e,'pickup@example.com',t,now(),false)<>'unknown_group' then raise exception 'Unknown group accepted'; end if;
end $$;
reset role;
insert into auth.users(id) values ('90000000-0000-0000-0000-000000000008');
set local request.jwt.claims='{"sub":"90000000-0000-0000-0000-000000000008"}';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.pickup_appointments) then raise exception 'Non-admin reads appointments'; end if;
 begin
 perform public.handle_calendly_webhook(null,null,null,null,null,null,null);
 raise exception 'Browser calls webhook RPC';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into private.admins values ('90000000-0000-0000-0000-000000000008');
set local role authenticated;
do $$ begin
 if (select count(*) from public.pickup_appointments where group_ref='90000000-0000-0000-0000-000000000003')<>3 then raise exception 'Admin cannot read appointments'; end if;
end $$;
reset role;
rollback;
