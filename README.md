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

Implemented: guest multi-car reservations, PHP pricing with a 10% discount for 7+ days, availability/overlap protection, vehicle details and photo uploads, admin login, fleet CRUD/maintenance, grouped booking management, rental status transitions, manual payment/refund records, embedded Calendly pickup scheduling and printable completed/paid receipts.

Guests pay at pickup. The website does not collect online payments. Admins record payments only after receiving them; those controls do not transfer money. Stripe was intentionally omitted from the current class demo by the user after account-region limitations were encountered. This differs from the original proposal's online-payment requirement; professor acceptance has not been confirmed.

Calendly scheduling works independently of Ridevia's payment records. The webhook backend and admin pickup history are implemented, but automatic syncing remains inactive on the user's Free plan. Activation still needs eligible plan access, private server credentials, function deployment and subscription registration. Appointment persistence/date validation is implemented in the prepared backend; the calendar widget itself opens the rental start date but does not restrict guests to it.

Car photos accept JPEG/PNG/WebP up to 5 MB. Existing cars keep placeholders until an admin uploads a photo. Multiple photos per car are deferred polish.

Completed, paid groups have View receipt → Print / Save as PDF. Receipts contain booking IDs, car/rental details, captured rates, discounts, payment methods and PHP total; private license/contact details and admin controls are excluded.

Offline UI checks:

- `node scripts/pickup-integration.mjs`: lazy Calendly embed, prefill and fallback link.
- `node scripts/receipt-integration.mjs`: fresh receipt eligibility, multi-car totals and print action.
- `node --test supabase/functions/calendly-webhook/handler.test.mjs`: signed webhook verification and routing.

The user has confirmed the photo upload, rental booking, real Calendly scheduling, admin reservation display and on-screen receipt. A full visual/responsive walkthrough, PDF/physical print layout and the proposal's latency benchmarks remain unverified. No public-launch readiness is claimed.
