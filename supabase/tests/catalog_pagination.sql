begin;
insert into public.cars(id,name,plate_number,daily_rate,category,maintenance) values
 ('b0000000-0000-0000-0000-000000000001','000 Page Sedan','PAGER-A',1000,'sedan',false),
 ('b0000000-0000-0000-0000-000000000002','000 Page SUV','PAGER-B',2000,'suv',false),
 ('b0000000-0000-0000-0000-000000000003','000 Hidden Car','PAGER-C',3000,'van',true);
set local role anon;
do $$
declare p jsonb; r jsonb; v_expected uuid; v_price numeric; v_previous numeric; v_car jsonb;
begin
 if exists(select 1 from public.car_catalog() where id='b0000000-0000-0000-0000-000000000003') then raise exception 'Maintenance catalog leak';end if;
 if exists(select 1 from public.cars where id='b0000000-0000-0000-0000-000000000003') then raise exception 'Maintenance direct-read leak';end if;
 if exists(select 1 from public.public_cars_by_ids(array['b0000000-0000-0000-0000-000000000003'::uuid])) then raise exception 'Maintenance detail leak';end if;
 p:=public.car_catalog_page(1,1,null,'name');
 select id into v_expected from public.car_catalog() order by name,id limit 1;
 if jsonb_array_length(p->'cars')<>1 or p->'cars'->0->>'id'<>v_expected::text then raise exception 'Catalog page/order failed';end if;
 r:=public.car_catalog_page(2,1,null,'name');
 if p->'cars'->0->>'id'=r->'cars'->0->>'id' then raise exception 'Catalog pages overlap';end if;
 if p->'cars'->0 ? 'plate_number' then raise exception 'Catalog exposed internal details';end if;
 p:=public.car_catalog_page(1,48,'sedan','price_asc');
 if exists(select 1 from jsonb_array_elements(p->'cars') c where c->>'category'<>'sedan') then raise exception 'Type filter ignored';end if;
 p:=public.car_catalog_page(1,48,null,'price_asc');
 v_previous:=null;
 for v_car in select value from jsonb_array_elements(p->'cars') loop
  v_price:=(v_car->>'daily_rate')::numeric;
  if v_previous is not null and v_price<v_previous then raise exception 'Price sorting failed';end if;
  v_previous:=v_price;
 end loop;
 p:=public.car_catalog_page(999999,1,null,'type');
 if (p->>'page')::int>(p->>'total')::int then raise exception 'Page not clamped';end if;
 begin perform public.car_catalog_page(0,6,null,'name');raise exception 'Invalid page accepted';exception when invalid_parameter_value then null;end;
 begin perform public.admin_booking_groups_page();raise exception 'Anon group access';exception when insufficient_privilege then null;end;
 r:=public.submit_booking(array['b0000000-0000-0000-0000-000000000001'::uuid,'b0000000-0000-0000-0000-000000000002'::uuid],current_date+200,current_date+207,'Pager Guest','pager-fixture@example.com','09123456789','PAGER');
end $$;
reset role;
insert into auth.users(id) values('b0000000-0000-0000-0000-000000000004');
set local request.jwt.claims='{"sub":"b0000000-0000-0000-0000-000000000004"}';
set local role authenticated;
do $$ begin
 begin perform public.admin_booking_groups_page();raise exception 'Non-admin group access';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into private.admins values('b0000000-0000-0000-0000-000000000004');
set local role authenticated;
do $$
declare p jsonb;g uuid;page_number int;found_group boolean:=false;
begin
 select group_ref into g from public.bookings where car_id='b0000000-0000-0000-0000-000000000001';
 p:=public.admin_booking_groups_page(1,1,false);
 for page_number in 1..(p->>'total')::int loop
  p:=public.admin_booking_groups_page(page_number,1,false);
  if jsonb_array_length(p->'groups')<>1 then raise exception 'Group page bound failed';end if;
  if p->'groups'->0->>'ref'=g::text then
   found_group:=true;
   if jsonb_array_length(p->'groups'->0->'rows')<>2 then raise exception 'Multi-car group split';end if;
  end if;
 end loop;
 if not found_group then raise exception 'Group missing';end if;
 p:=public.admin_booking_groups_page(1,20,true);
 if exists(select 1 from jsonb_array_elements(p->'groups') x where x->>'ref'=g::text) then raise exception 'Unpaid group in receipts';end if;
 perform public.update_booking_group(g,'ongoing');perform public.update_booking_group(g,'completed');perform public.update_booking_group(g,null,'paid','cash');
 p:=public.admin_booking_groups_page(1,20,true);
 if not exists(select 1 from jsonb_array_elements(p->'groups') x where x->>'ref'=g::text and jsonb_array_length(x->'rows')=2) then raise exception 'Completed paid group missing from receipts';end if;
end $$;
reset role;
rollback;
