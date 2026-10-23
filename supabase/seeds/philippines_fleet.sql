-- Optional class-demo inventory. Rates and plates are fictional, not market quotes.
-- MPVs use the existing van category. Run explicitly; never an automatic migration.
-- Stable IDs make reruns safe without overwriting admin changes or adding duplicates.
begin;
lock table public.cars in share row exclusive mode;
create temporary table ridevia_ph_seed (like public.cars including defaults) on commit drop;
insert into ridevia_ph_seed(id,name,plate_number,daily_rate,maintenance,make,model,category) values
 ('51000000-0000-0000-0000-000000000001','Toyota Vios 2023','DEMO-PH-001',1500,false,'Toyota','Vios','sedan'),
 ('51000000-0000-0000-0000-000000000002','Toyota Vios 2024','DEMO-PH-002',1700,false,'Toyota','Vios','sedan'),
 ('51000000-0000-0000-0000-000000000003','Toyota Innova 2023','DEMO-PH-003',2500,false,'Toyota','Innova','van'),
 ('51000000-0000-0000-0000-000000000004','Toyota Innova 2024','DEMO-PH-004',2800,false,'Toyota','Innova','van'),
 ('51000000-0000-0000-0000-000000000005','Mitsubishi Xpander 2023','DEMO-PH-005',2400,false,'Mitsubishi','Xpander','van'),
 ('51000000-0000-0000-0000-000000000006','Mitsubishi Xpander 2024','DEMO-PH-006',2600,false,'Mitsubishi','Xpander','van'),
 ('51000000-0000-0000-0000-000000000007','Mitsubishi Mirage G4 2023','DEMO-PH-007',1400,false,'Mitsubishi','Mirage G4','sedan'),
 ('51000000-0000-0000-0000-000000000008','Mitsubishi Mirage G4 2024','DEMO-PH-008',1600,false,'Mitsubishi','Mirage G4','sedan'),
 ('51000000-0000-0000-0000-000000000009','Toyota Avanza 2023','DEMO-PH-009',2100,false,'Toyota','Avanza','van'),
 ('51000000-0000-0000-0000-000000000010','Toyota Avanza 2024','DEMO-PH-010',2300,false,'Toyota','Avanza','van'),
 ('51000000-0000-0000-0000-000000000011','Toyota Fortuner 2023','DEMO-PH-011',3500,false,'Toyota','Fortuner','suv'),
 ('51000000-0000-0000-0000-000000000012','Toyota Fortuner 2024','DEMO-PH-012',3800,false,'Toyota','Fortuner','suv'),
 ('51000000-0000-0000-0000-000000000013','Toyota Raize 2024','DEMO-PH-013',2000,false,'Toyota','Raize','suv'),
 ('51000000-0000-0000-0000-000000000014','Toyota Hiace 2024','DEMO-PH-014',4500,false,'Toyota','Hiace','van'),
 ('51000000-0000-0000-0000-000000000015','Honda City 2024','DEMO-PH-015',1900,false,'Honda','City','sedan');
-- Count existing fleet entries plus only genuinely new seed entries before writing.
do $$
begin
 if exists (
   select lower(btrim(make)),lower(btrim(model)) from (
     select make,model from public.cars
     union all
     select s.make,s.model from ridevia_ph_seed s
     where not exists(select 1 from public.cars c where c.id=s.id)
   ) fleet group by lower(btrim(make)),lower(btrim(model)) having count(*)>3
 ) then
   raise exception 'Demo fleet would exceed three cars of the same make/model';
 end if;
end;
$$;
insert into public.cars(id,name,plate_number,daily_rate,maintenance,make,model,category)
 select id,name,plate_number,daily_rate,maintenance,make,model,category from ridevia_ph_seed
 on conflict(id) do nothing;
do $$
begin
 if (select count(*) from public.cars c join ridevia_ph_seed s using(id))<>15 then
   raise exception 'Expected all 15 Philippine demo cars';
 end if;
end;
$$;
commit;
