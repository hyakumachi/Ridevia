begin;
alter table public.cars add column image_paths text[] not null default '{}';
update public.cars set image_paths=array[image_path] where image_path is not null;
alter table public.cars add constraint car_gallery_size check (
 cardinality(image_paths)<=8 and array_position(image_paths,null) is null
);
create function private.validate_car_gallery() returns trigger
language plpgsql set search_path='' as $$
declare v_path text;
begin
 if tg_op='UPDATE' and new.image_paths is not distinct from old.image_paths and new.image_path is distinct from old.image_path then
   -- Older clients can replace the cover without losing additional photos.
   new.image_paths := case when new.image_path is null then array_remove(old.image_paths,old.image_path)
     else array_prepend(new.image_path,array_remove(old.image_paths,old.image_path)) end;
 elsif tg_op='INSERT' and cardinality(new.image_paths)=0 and new.image_path is not null then
   new.image_paths:=array[new.image_path];
 end if;
 if new.image_paths is null or cardinality(new.image_paths)>8 or array_position(new.image_paths,null) is not null or
    cardinality(new.image_paths)<>(select count(distinct p) from unnest(new.image_paths) p) then
   raise exception 'Select up to 8 distinct car photos' using errcode='23514';
 end if;
 foreach v_path in array new.image_paths loop
   if v_path !~ ('^'||new.id::text||'/[0-9a-f-]{36}[.](jpg|png|webp)$') then
     raise exception 'Invalid car photo path' using errcode='23514';
   end if;
 end loop;
 new.image_path:=new.image_paths[1];
 return new;
end;
$$;
create trigger validate_car_gallery before insert or update of image_path,image_paths on public.cars
 for each row execute function private.validate_car_gallery();
revoke all on function private.validate_car_gallery() from public,anon,authenticated;
drop function public.car_catalog();
create function public.car_catalog()
returns table(id uuid,name text,daily_rate numeric,maintenance boolean,make text,model text,category text,status text,image_path text,image_paths text[])
language sql stable security definer set search_path='' as $$
 select id,name,daily_rate,maintenance,make,model,category,status,image_path,image_paths from public.cars order by name,id;
$$;
revoke all on function public.car_catalog() from public,anon,authenticated;
grant execute on function public.car_catalog() to anon,authenticated;
grant select(image_paths) on public.cars to anon;
commit;
