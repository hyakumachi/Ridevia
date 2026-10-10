-- Optional demo inventory, not an automatic migration or production seed.
-- Fixed IDs make repeated execution safe without overwriting existing rates.
insert into public.cars(id,name,plate_number,daily_rate,maintenance) values
 ('50000000-0000-0000-0000-000000000001','Toyota Vios · Sample','DEMO-VIOS',1500,false),
 ('50000000-0000-0000-0000-000000000002','Toyota Innova · Sample','DEMO-INNOVA',2500,false),
 ('50000000-0000-0000-0000-000000000003','Mitsubishi Montero · Sample','DEMO-MONTERO',3500,false),
 ('50000000-0000-0000-0000-000000000004','Honda City · Sample','DEMO-CITY',1800,true)
on conflict (id) do nothing;
