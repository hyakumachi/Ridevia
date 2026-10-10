# Ridevia database

Apply the migrations in timestamp order, together, before enabling the frontend:

1. `20261010154131_initial_schema.sql`: cars, customers, bookings; RLS enabled with API access revoked; half-open date ranges and partial GiST exclusion constraint.
2. `20261010154132_authorization.sql`: private admin membership and RLS policies. No browser can provision an admin.
3. `20261010154133_booking_logic.sql`: validation triggers, anonymous submission, catalog, and explicit grants.

The original initial migration was empty. Do not edit these files after they have been applied; use a new migration for subsequent changes. All three migrations were applied to the linked Ridevia Supabase project on October 11, 2026. Do not reapply them manually; the CLI tracks their versions.

## Validate and deploy

With the Supabase CLI and Docker available, start a disposable local stack using `npx supabase start`, then apply with `npx supabase migration up --local`. `npx supabase db reset --local` is an alternative only when deleting local data is acceptable.

Run `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/booking_regression.sql`.

Review the migration diff and test results, then use `npx supabase db push --dry-run` to inspect pending hosted migrations. Apply with `npx supabase db push` only after review. These migrations create new tables; they do not import existing remote data.

## Admin provisioning

Create the admin's account through Supabase Auth. From trusted SQL (Dashboard SQL editor or a privileged database connection):

```sql
insert into private.admins(user_id) values ('<auth-user-uuid>');
-- Revoke immediately:
-- delete from private.admins where user_id = '<auth-user-uuid>';
```

Membership is checked on every request rather than trusting user-editable metadata or a stale JWT admin claim. Admins can manage the three tables; RLS blocks other authenticated users. Customers and bookings are never public. Use `car_catalog()` for catalog access with either browser role; it returns only id, name, daily_rate and maintenance. Anonymous direct car reads must explicitly select those columns rather than `*`.

## Frontend submission

```js
const { data, error } = await supabase.rpc('submit_booking', {
  p_car_ids: selectedCarIds,
  p_start_date: '2026-11-10',
  p_end_date: '2026-11-17',
  p_full_name: fullName,
  p_email: email,
  p_phone: phone,
  p_license_number: licenseNumber,
})
```

The result contains a server-generated `group_ref`, PHP group total, and per-car booking IDs, days, quoted rates, discount percentages, totals and pending statuses. One customer record is created per submission; no guest lookup or reuse by license/email exposes existing customer data. The whole call rolls back if any selected car fails.

The end date is exclusive. Seven days or more receive 10% off, rounded per car to centavos. Rates are captured at booking time and remain fixed after catalog rate changes. Booking customer, group, car, dates and quoted rate are immutable; cancel and rebook to change them. Pending and ongoing rows block overlaps; completed and cancelled rows release dates. Payments are managed by admins, never by guests. All active reservations must be resolved before putting a car into maintenance. Start dates use the Manila calendar.

## Two-session concurrency checks

On a disposable database, insert a car and note its UUID. In session A, begin a transaction, submit a reservation for that car, and leave it uncommitted. In session B, submit an overlapping reservation for the same car. B must wait; commit A and B must fail with SQLSTATE `23P01`. Repeat while rolling back A; B must succeed. Repeat using two car IDs in opposite order; sorted locking must avoid submission deadlocks.

For maintenance: in A, begin and update an unreserved car to maintenance. In B, submit a booking for it. B must wait; commit A and B must fail with `23514`. Reverse the order (A books, B sets maintenance); B must wait and then reject maintenance when A commits. Also repeat with an admin reactivating a cancelled reservation against an overlapping active one.

## Operational limits

Anonymous RPC submission prevents price/status tampering, but a public caller can create pending reservations without verifying identity. Add rate limits/CAPTCHA through a server endpoint and a pending-reservation expiry policy before public launch; the schema does not assume an unagreed expiry duration. `group_ref` is a grouping reference, not an authorization token. Do not expose customer or booking queries by reference alone.

PostgreSQL docs: https://www.postgresql.org/docs/17/rangetypes.html
Supabase function security: https://supabase.com/docs/guides/database/functions

## Validation status — October 11, 2026

All three migrations first passed in embedded PostgreSQL, then passed together with the regression suite on the actual linked Supabase project in a rolled-back transaction. After review of the dry-run and confirmation that the public/private schemas had no existing tables, the three migrations were deployed. The regression suite passed again against the installed schema.

Actual separate-session concurrency tests passed on Supabase:
- Committed active bookings reject overlapping reservations.
- Rolling back a reservation lets a waiting competitor succeed.
- Maintenance changes reject competing bookings.
- Booking creation rejects competing maintenance changes.
- Multi-car RPC submissions with reversed car order serialize without deadlock.

The browser publishable key successfully called `car_catalog()` (HTTP 200), while direct customer and booking reads returned HTTP 401. Temporary test records were removed. No admin has been provisioned and no real inventory/customer data has been added.

The security advisor reported no errors. Its warnings for public SECURITY DEFINER functions are intentional for the two narrowly scoped catalog/booking endpoints, with fixed search paths and restricted inputs/outputs. An existing Auth setting has leaked-password protection disabled; this is separate from the migrations. Anonymous reservation abuse protection is still needed before public launch.

To repeat concurrency tests on a linked development project, install/use the Supabase CLI and run `node supabase/tests/concurrency.mjs`. If the CLI is not on PATH, set `RIDEVIA_SUPABASE_CLI` to its executable path. The test creates and removes temporary fixtures; do not run it against a live customer database.

## Catalog and booking frontend — October 11, 2026

Migration `20261011010000_car_availability.sql` is deployed. The public function exposes only car IDs and availability booleans, validates the rental dates, and considers maintenance plus pending/ongoing overlaps. It is advisory; submission still locks cars and enforces the exclusion constraint. Availability assertions are included in the SQL regression suite.

Four clearly named sample cars have been added using `supabase/sample_cars.sql` (one under maintenance). This is an optional demo seed, separate from migrations, with fixed IDs to avoid duplicate inventory. Replace or remove the samples before real reservations.

The React frontend now loads the live catalog, checks date availability, supports multi-car selection, estimates PHP pricing with the seven-day discount, collects guest details, and submits via `submit_booking`. Confirmation shows the server-calculated total and reference; no payment is collected. Backend rejection refreshes availability, and in-flight duplicate submissions are prevented.

Validation passed: `npm test`, `npm run lint`, `npm run build`, actual Supabase SQL regression tests, and an automated DOM UI test with live catalog/availability and a real temporary two-car booking. The UI test verified the confirmation, discount, maintenance selection, duplicate-submit protection, and simulated conflict feedback; its temporary booking/customer were removed. A visual browser check could not run because this environment blocked browser startup.
