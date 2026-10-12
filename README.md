# Ridevia

Car-rental management class demonstration built with React, Vite, Tailwind CSS and Supabase.

## Run locally

Install dependencies with `npm install`. Create `.env.local` containing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, using your Supabase project URL and browser publishable key. Never add a secret/service-role key to a VITE variable.

Run `npm run dev` and open the displayed URL.

- `/`: guest catalog and multi-car booking form.
- `/#cars/<car-uuid>`: vehicle details, availability and server-calculated pricing.
- `/#admin`: Supabase Auth login and authorized car management.

Only trusted SQL may grant membership in `private.admins`. The application's public login cannot promote an account. See `supabase/README.md` for provisioning and database setup.

## Validation

- `npm test`: date and price-estimate checks.
- `npm run lint` and `npm run build`: code and production-build checks.
- `supabase/tests/booking_regression.sql` and `supabase/tests/proposal_alignment.sql`: rollback-only SQL suites against a development database.
- `npm run test:integration`: real Supabase Auth and DOM UI integration checks. Requires an authenticated Supabase CLI on PATH and a linked development project. Set `RIDEVIA_SUPABASE_CLI` if the executable is elsewhere. The script creates temporary Auth users, cars and bookings and cleans them up; run only on the class/demo database. Privileged test keys remain in memory and are never bundled into the frontend.

## Current demonstration scope

Guest reservations, pricing/discounts, conflict prevention, date availability, car details, admin login, and fleet CRUD/maintenance are implemented. Booking lifecycle management, manual payment controls, Calendly/Stripe/webhook integration and printable receipts remain. Sample cars are clearly labeled. Visual browser QA and the proposal's latency benchmarks remain unverified.

The admin dashboard also includes grouped booking management, rental lifecycle actions, and confirmed manual payment/refund recording. These records do not transfer money. Status transitions and atomic group changes are enforced in the database. Online payment integration and printable receipts remain upcoming milestones.

Admins can upload an optional car photo while adding/editing a car (JPEG/PNG/WebP, up to 5 MB). Stored photos appear on rental cards and vehicle details. Existing sample cars retain their illustrations until a photo is uploaded. Uploaded photos are public; only admins can manage them.

After a successful reservation, guests can open the Calendly pickup scheduler or its fallback link. Name/email are prefilled and group_ref is passed as utm_content for future webhook correlation. The scheduler opens on the rental start date but does not enforce it. Appointment persistence/date validation and payment processing remain separate unfinished steps. Run `node scripts/pickup-integration.mjs` for the offline embed test.

The Calendly webhook backend and admin pickup history are implemented. Live connection is pending an eligible Calendly plan, private credentials, function deployment and subscription registration. Appointments and payments remain separate. Run `node --test supabase/functions/calendly-webhook/handler.test.mjs` for signature, request-filtering and persistence-routing tests.
