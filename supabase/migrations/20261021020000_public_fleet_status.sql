begin;
create function private.fleet_status(p_car_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select case
  when exists(select 1 from public.cars where id=p_car_id and maintenance) then 'maintenance'
  when exists(select 1 from public.bookings where car_id=p_car_id and status='ongoing') then 'rented'
  when exists(select 1 from public.bookings where car_id=p_car_id and status='pending') then 'reserved'
  else 'available' end;
$$;
revoke all on function private.fleet_status(uuid) from public,anon,authenticated;
create or replace function public.car_catalog()
returns table(id uuid,name text,daily_rate numeric,maintenance boolean,make text,model text,category text,status text,image_path text,image_paths text[])
language sql stable security definer set search_path='' as $$
 select id,name,daily_rate,maintenance,make,model,category,private.fleet_status(id),image_path,image_paths from public.cars where not maintenance order by name,id;
$$;
create or replace function public.car_catalog_page(p_page integer default 1,p_page_size integer default 6,p_category text default null,p_sort text default 'name')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_total integer; v_page integer; v_cars jsonb;
begin
 if p_page is null or p_page<1 or p_page_size is null or p_page_size not between 1 and 48 or
    p_sort is null or p_sort not in ('name','type','price_asc','price_desc') or
    (p_category is not null and p_category not in ('sedan','suv','van')) then
   raise exception 'Invalid catalog page' using errcode='22023'; end if;
 select count(*) into v_total from public.cars where not maintenance and (p_category is null or category=p_category);
 v_page:=least(p_page,greatest(1,ceil(v_total::numeric/p_page_size)::integer));
 select coalesce(jsonb_agg(to_jsonb(c)),'[]') into v_cars from (
  select id,name,daily_rate,maintenance,make,model,category,private.fleet_status(id) as status,image_path,image_paths
  from public.cars where not maintenance and (p_category is null or category=p_category)
  order by case when p_sort='type' then category end,
    case when p_sort='price_asc' then daily_rate end asc,
    case when p_sort='price_desc' then daily_rate end desc,name,id
  limit p_page_size offset ((v_page-1)::bigint*p_page_size)
 ) c;
 return jsonb_build_object('cars',v_cars,'total',v_total,'page',v_page,'page_size',p_page_size);
end;
$$;
create or replace function public.public_cars_by_ids(p_ids uuid[])
returns table(id uuid,name text,daily_rate numeric,maintenance boolean,make text,model text,category text,status text,image_path text,image_paths text[])
language plpgsql stable security definer set search_path='' as $$
begin
 if p_ids is null or cardinality(p_ids) not between 1 and 20 or array_position(p_ids,null) is not null then
   raise exception 'Invalid selection' using errcode='22023';end if;
 return query select c.id,c.name,c.daily_rate,c.maintenance,c.make,c.model,c.category,private.fleet_status(c.id),c.image_path,c.image_paths
 from public.cars c where c.id=any(p_ids) and not c.maintenance order by c.name,c.id;
end;
$$;
commit;
