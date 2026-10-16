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

For maintenance: in A, begin and update an unreserved car to maintenance. In B, submit a booking for it. B must wait; commit A and B must fail with `23514`. Reverse the order (A books, B sets maintenance); B must wait and then reject maintenance when A commits. Cancelled reservations cannot be reactivated after the lifecycle migration; reschedule by submitting a new reservation.

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

The browser publishable key successfully called `car_catalog()` (HTTP 200), while direct customer and booking reads returned HTTP 401. Temporary test records were removed. The chosen existing Supabase Auth account is now authorized through private.admins. No real inventory/customer data has been added.

The security advisor reported no errors. Its warnings for public SECURITY DEFINER functions are intentional for the two narrowly scoped catalog/booking endpoints, with fixed search paths and restricted inputs/outputs. An existing Auth setting has leaked-password protection disabled; this is separate from the migrations. Anonymous reservation abuse protection is still needed before public launch.

To repeat concurrency tests on a linked development project, install/use the Supabase CLI and run `node supabase/tests/concurrency.mjs`. If the CLI is not on PATH, set `RIDEVIA_SUPABASE_CLI` to its executable path. The test creates and removes temporary fixtures; do not run it against a live customer database.

## Catalog and booking frontend — October 11, 2026

Migration `20261011010000_car_availability.sql` is deployed. The public function exposes only car IDs and availability booleans, validates the rental dates, and considers maintenance plus pending/ongoing overlaps. It is advisory; submission still locks cars and enforces the exclusion constraint. Availability assertions are included in the SQL regression suite.

Four clearly named sample cars have been added using `supabase/sample_cars.sql` (one under maintenance). This is an optional demo seed, separate from migrations, with fixed IDs to avoid duplicate inventory. Replace or remove the samples before real reservations.

The React frontend now loads the live catalog, checks date availability, supports multi-car selection, estimates PHP pricing with the seven-day discount, collects guest details, and submits via `submit_booking`. Confirmation shows the server-calculated total and reference; no payment is collected. Backend rejection refreshes availability, and in-flight duplicate submissions are prevented.

Validation passed: `npm test`, `npm run lint`, `npm run build`, actual Supabase SQL regression tests, and an automated DOM UI test with live catalog/availability and a real temporary two-car booking. The UI test verified the confirmation, discount, maintenance selection, duplicate-submit protection, and simulated conflict feedback; its temporary booking/customer were removed. A visual browser check could not run because this environment blocked browser startup.

## Proposal alignment and fleet administration — October 11, 2026

Migration `20261011020000_proposal_alignment.sql` is deployed. It adds cars.make/model/category and bookings.payment_method. cars.status is generated from maintenance, so the two representations cannot diverge. Known sample metadata is backfilled; older custom cars keep Unspecified make/model until edited. NaN rates are rejected. The public catalog now exposes vehicle details while keeping plate numbers private.

The proposal's `check_availability(car,date,date)` and `calculate_price(car,date,date)` interfaces are now public controlled RPCs. Their named arguments are p_car_id, p_start_date and p_end_date. Pricing returns a PHP quote with rental_days, daily_rate, discount_percent and total_price; availability does not reveal reservations/customer data. `is_admin()` is an authenticated, security-invoker wrapper over trusted private membership.

Compatibility decisions: existing UUID IDs, total_price, full_name/email/phone and required group_ref remain. The private admin table stores authorization membership only; Auth owns all credentials. Existing cancellation spelling is cancelled. These differ from the proposal diagram and are documented rather than silently changing deployed interfaces.

Admin login/car management are implemented. Add/edit forms enforce required vehicle details, category, positive rates and maintenance selection. Delete requires an explicit UI confirmation; foreign keys protect cars with booking history. The backend prevents maintenance while active bookings exist. A public detail page checks server-side availability/pricing and carries the selected car/dates into the booking form.

The chosen existing confirmed Auth account was authorized without changing its password. For a new invited account or recovery, the private one-time setup URL is `/#admin/setup?token=<hashed_token>&type=invite` (or recovery). Tokens must be generated using a trusted server-side Auth admin client. The UI verifies the token once, clears it from the address bar and lets the account holder set a password. No email is sent by this process. Never commit setup URLs/tokens. Verification follows Supabase documentation: https://supabase.com/docs/reference/javascript/auth-verifyotp .

Passed: original booking SQL regression plus proposal-alignment preflight on actual Supabase (rolled back), proposal SQL suite after deployment, npm tests/lint/build, live guest UI regression, and real Auth/admin DOM integration checks. Those tests cover non-admin rejection, fleet CRUD, maintenance/date availability, booking-history protection, one-time password setup, and detail-to-booking navigation. All temporary test users and fixtures were removed. Actual browser visual layout checks remain pending.

## Grouped booking administration — October 11, 2026

Migration `20261011030000_booking_management.sql` adds database-enforced lifecycle rules and authenticated `update_booking_group(p_group_ref,p_status,p_payment_status,p_payment_method)`. Every call checks current private admin membership, locks cars in the same order as submission, and changes all group members in one transaction. Anonymous callers cannot execute it; non-admin authenticated callers are rejected. RLS continues to protect booking/customer reads.

New reservations must be pending/unpaid. Allowed rental changes are pending → ongoing → completed, or pending/ongoing → cancelled. Completed/cancelled rows cannot be reopened; cancel and submit a new booking to reschedule. An unchanged status is harmless. Completion/cancellation release availability. The trigger applies to direct table updates as well as RPCs.

Manual payment records follow unpaid → paid → refunded. Paid records require cash/card/gcash/other; their recorded method cannot be rewritten. Cancel a reservation before recording its refund. Refunds and recorded payments cannot be undone through this workflow. Completed rentals may remain unpaid until an administrator records collection. Payments/refunds are bookkeeping only: neither the UI nor the RPC transfers money. Online payment/webhook integration and receipts are separate remaining milestones.

The admin dashboard now has Cars and Bookings sections. Reservations are grouped by group_ref, with contact/license information, per-car booking IDs/statuses/payment methods, captured prices and group totals. Start/complete act on all cars; cancellation, recording collection and recording a refund require confirmation. Failed or uncertain changes prompt a reload before retrying. Mixed groups can be displayed, but the UI offers only actions valid for every member.

Validation: preflight migration plus `supabase/tests/booking_management.sql` in a rolled-back transaction; post-deploy lifecycle and original booking regression suites; lint, build and pricing/date unit tests. The lifecycle suite covers anonymous/non-admin rejection, private reads, invalid transitions, direct-update bypasses, payment-method validation, terminal records, group rollback and released dates. Extended live Auth/DOM integration and real concurrent group updates are run against disposable fixtures on this linked class-demo project. Use the CLI override described above to repeat them. Browser visual checks remain manual.

## Car photos — October 12, 2026

The requested image-upload feature extends the original proposal's excluded image-upload scope. Migration `20261012010000_car_photos.sql` adds cars.image_path and a public `car-photos` Storage bucket. Bucket uploads are limited to JPEG/PNG/WebP and 5 MB. Storage RLS allows admin insert/select/delete only; guest and ordinary authenticated uploads are denied. Photos are intentionally public. The catalog exposes the photo path; private customer/booking data stays protected.

Car management accepts an optional photo on add/edit. A unique car-ID/object-ID path is uploaded before saving the car record; choosing a new photo replaces the displayed photo on save. Paths are constrained to this car's folder, rather than arbitrary URLs. Rental cards, vehicle details and admin fleet/editor views display stored photos, with an illustration if a photo is missing or fails to load. Old sample cars have no photos until uploaded by an admin.

Storage upload and database save are separate requests. Failed/uncertain saves may leave unlinked objects; replaced/deleted car photos are retained to avoid deleting photos still referenced by a concurrent edit. For this class demo, clean unreferenced objects through trusted Storage administration when needed. Do not automatically delete objects on uncertain network failures.

Validation covers local file-type/size boundaries, SQL storage authorization/path/catalog checks, and a real temporary admin upload with public byte download plus rental/detail image rendering and unauthorized insert/delete checks. No web preview is required for these tests.

## Calendly pickup entry — October 12, 2026

The confirmation page now lazily loads the official Calendly widget for the configured vehicle-pickup event. It prefills guest name/email and carries group_ref as utm_content; no phone/license details are sent. A prefilled public link provides a fallback if the script is blocked. No database migration is needed for this entry step. Calendly confirmations do not change booking/payment status. Backend webhook verification, appointment persistence/correlation and validation of the pickup date against the rental remain unfinished. Browser events or UTM values must never be treated as payment proof or customer authorization.

The app opens the rental start date in Calendly, but guests can select a different date. This must be validated in the later backend integration. A calendar appointment alone does not prove a completed payment. The confirmation state is in memory; guests should save their rental reference and Calendly confirmation. Tests verify URL encoding/minimal data sharing, lazy widget initialization with prefills/group tracking under StrictMode, and a direct-link fallback. The component test stubs Calendly and makes no real appointments.

Official embed instructions: https://calendly.com/help/how-to-pre-fill-invitee-information-in-an-embed .

## Calendly appointment backend — October 12, 2026

`20261012020000_pickup_appointments.sql` creates admin-readable pickup history and the service-role-only `handle_calendly_webhook` RPC. Signed created/cancelled notifications persist by invitee URI; duplicate deliveries are harmless and cancellation cannot be undone by a delayed creation. Known rental groups are locked during processing. Email/date mismatches and terminal rentals become needs_review. Appointment cancellation does not cancel the car rental or refund/record payments. Appointment history is retained independently of booking deletion.

The `calendly-webhook` Edge Function checks the raw body HMAC, a three-minute timestamp tolerance and a 256 KB limit before doing network work. It fetches the canonical scheduled event with a private Calendly token, restricts requests to Calendly scheduled-event UUID URLs, filters the configured event type, and calls the trusted RPC. Missing credentials fail closed with 503. Provider outages/persistence failures return 503 for retry; unrelated events return 200. The webhook does not accept browser scheduling messages or assert successful payment.

Activation requires a webhook-eligible Calendly plan. Store CALENDLY_ACCESS_TOKEN, CALENDLY_WEBHOOK_SIGNING_KEY and CALENDLY_EVENT_TYPE_URI as Supabase Edge Function secrets, never VITE variables or committed files. Built-in SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY stay server-side. Deploy with `supabase functions deploy calendly-webhook`; config explicitly disables Supabase JWT checks because Calendly authenticates with its own signature. This is safe only with the handler's HMAC verification intact. The callback URL is https://nkziuwebtbyeswtgrfrp.supabase.co/functions/v1/calendly-webhook . Register a user-scoped Calendly subscription for invitee.created and invitee.canceled using the same signing key; do not send email notifications or create appointments during setup without user authorization.

Activation and a genuine Calendly end-to-end callback are still pending account access. Run `node --test supabase/functions/calendly-webhook/handler.test.mjs` for offline security tests, and `supabase db query --linked --file supabase/tests/pickup_appointments.sql` for rollback-only SQL assertions. The admin Bookings page shows appointment history in Philippine Time and review reasons. Unknown/malformed group references are not attached to bookings. A needs_review row does not automatically cancel the appointment in Calendly; an admin must follow up and fix the scheduling there.

Official requirements/signing guide: https://calendly.com/help/calendly-api-overview and https://developer.calendly.com/api-docs/overview/webhooks/webhook-signatures .

## Completed/paid receipts — October 12, 2026

FR-7 is implemented as an admin receipt view using existing RLS-protected booking reads; no migration or public lookup endpoint is added. All group members must be completed and paid. The receipt fetches the group again when opened and checks eligibility before showing print controls. It lists the customer name, group reference, every booking ID, vehicle/plate, rental dates/days, captured daily rate, discount, paid amount/method and PHP total. Totals sum stored per-car amounts in centavos. License/contact details and admin actions are excluded. The browser print dialog can print or save PDF. No email is sent, no money is transferred, and no separate receipt numbering/tax-document system is introduced.

Unit tests cover all-member eligibility and centavo totals. The offline DOM integration checks pending/unpaid exclusion, a stale list becoming ineligible on receipt fetch, fresh reads, multi-car totals/discounts, escaped customer text, omitted private details, print invocation and return navigation. Browser print preview and pagination remain manual checks; web previews have not been started for implementation.

## Pay-at-pickup demo scope — October 15, 2026

The user chose to omit Stripe from this class demo. Guest booking/confirmation instructions now state pay at pickup; no online funds are collected. Manual payment/refund records and completed/paid receipts remain implemented. The original proposal's online-payment requirement is not fulfilled and professor acceptance of this scope change has not been confirmed. Calendly scheduling remains available, while automatic appointment syncing is inactive on the Free plan. No payment-related database behavior was changed.
