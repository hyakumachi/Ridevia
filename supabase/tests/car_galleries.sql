begin;
insert into public.cars(id,name,plate_number,daily_rate,image_path)
values('a0000000-0000-0000-0000-000000000001','Gallery Test','GALLERY-TEST',1000,
'a0000000-0000-0000-0000-000000000001/a0000000-0000-0000-0000-000000000002.jpg');
do $$
declare car public.cars%rowtype; first_path text:='a0000000-0000-0000-0000-000000000001/a0000000-0000-0000-0000-000000000002.jpg'; second_path text:='a0000000-0000-0000-0000-000000000001/a0000000-0000-0000-0000-000000000003.png'; third_path text:='a0000000-0000-0000-0000-000000000001/a0000000-0000-0000-0000-000000000004.webp';
begin
 select * into car from public.cars where id='a0000000-0000-0000-0000-000000000001';
 if car.image_paths<>array[first_path] then raise exception 'Legacy cover not preserved';end if;
 update public.cars set image_paths=array[first_path,second_path] where id=car.id;
 update public.cars set image_paths=array[second_path,first_path] where id=car.id;
 if (select image_path from public.cars where id=car.id)<>second_path then raise exception 'Cover reordering failed';end if;
 update public.cars set image_path=third_path where id=car.id;
 if (select image_paths from public.cars where id=car.id)<>array[third_path,first_path] then raise exception 'Legacy client discarded extra photos';end if;
 begin
  update public.cars set image_paths=array[first_path,first_path] where id=car.id;
  raise exception 'Duplicate photo accepted';
 exception when check_violation then null;end;
 begin
  update public.cars set image_paths=array['another-car/file.jpg'] where id=car.id;
  raise exception 'Another car path accepted';
 exception when check_violation then null;end;
 begin
  update public.cars set image_paths=array[null::text] where id=car.id;
  raise exception 'Null photo accepted';
 exception when check_violation then null;end;
 begin
  update public.cars set image_paths=(select array_agg(car.id::text||'/'||gen_random_uuid()::text||'.jpg') from generate_series(1,9)) where id=car.id;
  raise exception 'Too many photos accepted';
 exception when check_violation then null;end;
 update public.cars set image_paths='{}' where id=car.id;
 if (select image_path from public.cars where id=car.id) is not null then raise exception 'Empty gallery retained cover';end if;
end $$;
set local role anon;
do $$ begin
 if not exists(select 1 from public.car_catalog() where id='a0000000-0000-0000-0000-000000000001' and image_paths='{}') then raise exception 'Gallery missing from catalog';end if;
end $$;
reset role;
rollback;
