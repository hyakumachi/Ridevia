begin;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  plate_number text not null unique check (length(btrim(plate_number)) between 1 and 30),
  daily_rate numeric(12,2) not null check (daily_rate > 0),
  maintenance boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  email text not null check (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  phone text not null check (length(btrim(phone)) between 7 and 30),
  license_number text not null check (length(btrim(license_number)) between 1 and 60),
  created_at timestamptz not null default now()
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  group_ref uuid not null,
  customer_id uuid not null references public.customers(id),
  car_id uuid not null references public.cars(id),
  start_date date not null,
  end_date date not null,
  rental_days integer generated always as (end_date - start_date) stored,
  daily_rate numeric(12,2) not null check (daily_rate > 0),
  discount_percent integer generated always as (case when end_date - start_date >= 7 then 10 else 0 end) stored,
  total_price numeric(16,2) generated always as
    (round(daily_rate * (end_date - start_date) * case when end_date - start_date >= 7 then 0.90 else 1 end, 2)) stored,
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null default 'pending' check (status in ('pending','ongoing','completed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  created_at timestamptz not null default now(),
  check (isfinite(start_date) and isfinite(end_date) and end_date > start_date),
  unique (group_ref, car_id),
  exclude using gist (car_id with =, daterange(start_date, end_date, '[)') with &&)
    where (status in ('pending', 'ongoing'))
);
create index bookings_customer_idx on public.bookings(customer_id);
-- No API access until authorization and booking validation are installed.
alter table public.cars enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
revoke all on public.cars, public.customers, public.bookings from public, anon, authenticated, service_role;
commit;
