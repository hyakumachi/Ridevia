begin;
alter table public.cars add column image_path text
  check (image_path is null or image_path ~ ('^' || id::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('car-photos','car-photos',true,5242880,array['image/jpeg','image/png','image/webp']);
-- Public car photos only; customers and booking data remain protected by their own RLS.
create policy car_photos_admin_select on storage.objects for select to authenticated
using (bucket_id='car-photos' and (select private.is_admin()));
create policy car_photos_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='car-photos' and (select private.is_admin()) and
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$');
create policy car_photos_admin_delete on storage.objects for delete to authenticated
using (bucket_id='car-photos' and (select private.is_admin()));
-- New unique object names avoid overwriting cached photos or another admin's upload.
drop function public.car_catalog();
create function public.car_catalog()
returns table(id uuid,name text,daily_rate numeric,maintenance boolean,make text,model text,category text,status text,image_path text)
language sql stable security definer set search_path = '' as $$
select id,name,daily_rate,maintenance,make,model,category,status,image_path from public.cars order by name,id;
$$;
revoke all on function public.car_catalog() from public,anon,authenticated;
grant execute on function public.car_catalog() to anon,authenticated;
grant select(image_path) on public.cars to anon;
commit;
