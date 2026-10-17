begin;
create or replace function public.car_catalog()
returns table(id uuid,name text,daily_rate numeric,maintenance boolean,make text,model text,category text,status text,image_path text,image_paths text[])
language sql stable security definer set search_path='' as $$
 select id,name,daily_rate,maintenance,make,model,category,status,image_path,image_paths from public.cars where not maintenance order by name,id;
$$;
drop policy cars_catalog on public.cars;
create policy cars_catalog on public.cars for select to anon using (not maintenance);

create function public.car_catalog_page(p_page integer default 1,p_page_size integer default 6,p_category text default null,p_sort text default 'name')
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
  select id,name,daily_rate,maintenance,make,model,category,status,image_path,image_paths
  from public.cars where not maintenance and (p_category is null or category=p_category)
  order by case when p_sort='type' then category end,
    case when p_sort='price_asc' then daily_rate end asc,
    case when p_sort='price_desc' then daily_rate end desc,name,id
  limit p_page_size offset ((v_page-1)::bigint*p_page_size)
 ) c;
 return jsonb_build_object('cars',v_cars,'total',v_total,'page',v_page,'page_size',p_page_size);
end;
$$;
create function public.public_cars_by_ids(p_ids uuid[])
returns table(id uuid,name text,daily_rate numeric,maintenance boolean,make text,model text,category text,status text,image_path text,image_paths text[])
language plpgsql stable security definer set search_path='' as $$
begin
 if p_ids is null or cardinality(p_ids) not between 1 and 20 or array_position(p_ids,null) is not null then
   raise exception 'Invalid selection' using errcode='22023';end if;
 return query select c.id,c.name,c.daily_rate,c.maintenance,c.make,c.model,c.category,c.status,c.image_path,c.image_paths
 from public.cars c where c.id=any(p_ids) and not c.maintenance order by c.name,c.id;
end;
$$;
create function public.car_availability_for_ids(p_ids uuid[],p_start_date date,p_end_date date)
returns table(car_id uuid,available boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_ids is null or cardinality(p_ids) not between 1 and 32 or array_position(p_ids,null) is not null or
    p_start_date is null or p_end_date is null or not isfinite(p_start_date) or not isfinite(p_end_date) or
    p_end_date<=p_start_date or p_start_date<(current_timestamp at time zone 'Asia/Manila')::date then
  raise exception 'Invalid availability request' using errcode='22023';end if;
 return query select c.id,not c.maintenance and not exists(select 1 from public.bookings b where b.car_id=c.id and b.status in ('pending','ongoing')
  and daterange(b.start_date,b.end_date,'[)') && daterange(p_start_date,p_end_date,'[)'))
 from public.cars c where c.id=any(p_ids);
end;
$$;
revoke all on function public.car_catalog_page(integer,integer,text,text),public.public_cars_by_ids(uuid[]),public.car_availability_for_ids(uuid[],date,date) from public,anon,authenticated;
grant execute on function public.car_catalog_page(integer,integer,text,text),public.public_cars_by_ids(uuid[]),public.car_availability_for_ids(uuid[],date,date) to anon,authenticated;

create function public.admin_booking_groups_page(p_page integer default 1,p_page_size integer default 5,p_receipts_only boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_total integer; v_page integer; v_groups jsonb;
begin
 if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_page_size is null or p_page_size not between 1 and 20 or p_receipts_only is null then
  raise exception 'Invalid booking page' using errcode='22023';end if;
 select count(*) into v_total from (
  select group_ref from public.bookings group by group_ref
  having not p_receipts_only or bool_and(status='completed' and payment_status='paid')
 ) g;
 v_page:=least(p_page,greatest(1,ceil(v_total::numeric/p_page_size)::integer));
 with page_groups as (
  select group_ref,max(created_at) latest from public.bookings group by group_ref
  having not p_receipts_only or bool_and(status='completed' and payment_status='paid')
  order by max(created_at) desc,group_ref limit p_page_size offset ((v_page-1)::bigint*p_page_size)
 ), details as (
  select g.group_ref,g.latest,jsonb_agg(jsonb_build_object(
    'id',b.id,'group_ref',b.group_ref,'start_date',b.start_date,'end_date',b.end_date,'rental_days',b.rental_days,
    'daily_rate',b.daily_rate,'total_price',b.total_price,'discount_percent',b.discount_percent,
    'status',b.status,'payment_status',b.payment_status,'payment_method',b.payment_method,
    'customers',jsonb_build_object('full_name',c.full_name,'email',c.email,'phone',c.phone,'license_number',c.license_number),
    'cars',jsonb_build_object('name',v.name,'plate_number',v.plate_number)) order by b.car_id,b.id) rows
  from page_groups g join public.bookings b on b.group_ref=g.group_ref join public.customers c on c.id=b.customer_id join public.cars v on v.id=b.car_id
  group by g.group_ref,g.latest
 ) select coalesce(jsonb_agg(jsonb_build_object('ref',group_ref,'rows',rows) order by latest desc,group_ref),'[]') into v_groups from details;
 return jsonb_build_object('groups',v_groups,'total',v_total,'page',v_page,'page_size',p_page_size);
end;
$$;
revoke all on function public.admin_booking_groups_page(integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.admin_booking_groups_page(integer,integer,boolean) to authenticated;
create index cars_catalog_order_idx on public.cars(name,id) where not maintenance;
create index cars_catalog_category_idx on public.cars(category,name,id) where not maintenance;
create index bookings_created_group_idx on public.bookings(created_at desc,group_ref);
commit;
