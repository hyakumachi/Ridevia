# Frontend structure and design entry points

Ridevia uses React components with Tailwind CSS v4. App.jsx only routes between pages. There is no App.css. No component depends on the old global CSS class names.

```text
src/
  pages/                 GuestBooking, AdminPage, CarDetailPage, ContactPage
  components/
    layout/              SiteLayout, SiteHeader, SiteFooter
    ui/                  Button, Input, Select, Field, Panel
    booking/             Guest date fields, catalog/cards, details, confirmation, Calendly
    cars/                Photo/gallery, specifications, trip quote
    admin/               Login/setup, fleet form/photo editor/list, booking groups/actions, receipt
  hooks/                 Guest booking, admin authentication, car editing, car detail state/API work
  lib/                   Supabase client, pricing, receipt/photo validation, formatting
  index.css              Tailwind import, theme tokens, base body/focus styles, print margins
```

## Where to apply your design

- Edit theme colors/font in `src/index.css` first.
- Shared buttons, inputs, selects, labels and panels are in `components/ui/`; their variants/classes are the app's shared controls.
- Header/footer and overall page width live in `components/layout/`.
- Rental-card design and maximum width live in `components/booking/CarCard.jsx`; the responsive grid is in CarCatalog.jsx.
- Admin photo upload/cover/remove controls are in `components/admin/PhotoEditor.jsx`; vehicle field layout is in CarForm.jsx.
- The car-detail gallery is in `components/cars/CarGallery.jsx`.
- Receipt layout and Tailwind print variants live in `components/admin/RentalReceipt.jsx`.
- Change markup and Tailwind utilities in those views without moving API requests into presentation components. State/effects and existing validation/error handling remain in hooks/controllers.

## Photo galleries and bounded cards

Each car supports up to eight JPEG/PNG/WebP photos, maximum 5 MB each. Select multiple files in Car photos; new files append to the gallery on save. Use as cover reorders an existing photo to first position; Remove photo removes that entry on save. The first photo is the public rental-card cover. Additional images are selectable on the detail page. Existing single-photo cars are backfilled automatically.

Rental cards are capped at 360 px, with responsive image aspect ratios. Admin booking cards are capped at 896 px, and the site shell at 1152 px. Edit those Tailwind max-width/grid utilities for your design; do not add global card selectors.

Storage objects are uniquely named and not immediately deleted when removed from a gallery. As before, unreferenced objects may need trusted Storage cleanup; deleting them automatically after uncertain database responses could remove a photo still in use.

## Checks

- `npm run lint`, `npm test`, `npm run build`.
- `node scripts/guest-integration.mjs`: offline guest/gallery, discount, duplicate-submit and conflict checks.
- `node scripts/pickup-integration.mjs`: offline Calendly widget/prefill checks.
- `node scripts/receipt-integration.mjs`: offline fresh receipt eligibility/print checks.
- `npm run test:integration`: live development-project Auth, photo upload/gallery/cover/removal, admin CRUD and booking lifecycle checks. Temporary fixtures are cleaned up; never run this on a customer database.
- `supabase/tests/car_galleries.sql`: rollback-only database gallery validation and compatibility tests.

No preview/browser was opened during this refactor. Visual responsive and PDF-print checks still require a manual pass when previews are allowed.

## Catalog controls and pagination

The home catalog now uses a two-column grid from the small-screen breakpoint onward, with equal-height cards capped at 360 px, consistent photo aspect ratios, and a two-line title area. Maintenance cars are excluded by the public catalog/detail queries, not merely hidden by CSS.

CarCatalog contains the category filter and name/type/price sort controls. useGuestBooking keeps selected car records independently of the current page so filtering/sorting/paging does not lose a multi-car selection. The selected list provides removal controls even when a car is off-page. Availability requests include only the current page plus selected IDs (up to 26 IDs), instead of downloading availability for the entire fleet.

Shared Pagination provides numbered pages, previous/next and item counts. Controls appear only when multiple pages exist. Page sizes: 6 guest cars, 8 admin fleet cars, 5 booking groups/receipts. Query limits are enforced on the backend. Admin Bookings offers All bookings and Receipts; receipt filtering requires every group member to be completed and paid. Pagination occurs at the group level so one reservation never spans two list pages. An individual receipt still includes the full group.

`supabase/tests/catalog_pagination.sql` verifies maintenance visibility, bounded pages, sorting/filtering, authorization and group integrity. `scripts/pagination-integration.mjs` checks fleet ranges and booking/receipt page navigation offline. Both are included in the documented development test workflow; UI tests are bundled under `npm run test:ui`.
