begin;
insert into auth.users(id) values ('80000000-0000-0000-0000-000000000001');
set local request.jwt.claims='{"sub":"80000000-0000-0000-0000-000000000001"}';
set local role authenticated;
do $$ begin
  begin
    insert into storage.objects(bucket_id,name) values ('car-photos','80000000-0000-0000-0000-000000000002/80000000-0000-0000-0000-000000000003.png');
    raise exception 'Non-admin upload allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into private.admins values ('80000000-0000-0000-0000-000000000001');
insert into public.cars(id,name,plate_number,daily_rate) values ('80000000-0000-0000-0000-000000000002','Photo test','PHOTO-TEST',1000);
set local role authenticated;
insert into storage.objects(bucket_id,name) values ('car-photos','80000000-0000-0000-0000-000000000002/80000000-0000-0000-0000-000000000003.png');
update public.cars set image_path='80000000-0000-0000-0000-000000000002/80000000-0000-0000-0000-000000000003.png' where id='80000000-0000-0000-0000-000000000002';
do $$ begin
  begin
    update public.cars set image_path='https://example.com/arbitrary.jpg' where id='80000000-0000-0000-0000-000000000002';
    raise exception 'Arbitrary URL accepted';
  exception when check_violation then null; end;
  begin
    insert into storage.objects(bucket_id,name) values ('car-photos','bad.svg');
    raise exception 'Invalid storage path accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  if not exists(select 1 from public.car_catalog() where id='80000000-0000-0000-0000-000000000002' and image_path is not null) then
    raise exception 'Public catalog missing image'; end if;
  begin
    insert into storage.objects(bucket_id,name) values ('car-photos','80000000-0000-0000-0000-000000000002/80000000-0000-0000-0000-000000000004.png');
    raise exception 'Anonymous upload allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
