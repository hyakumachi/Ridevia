# Local Supabase development

Start Docker Desktop, then run `npx supabase start` from the project folder.

Run `npm run dev:local` to start Vite using the ignored `.env.offline.local` configuration. Normal `npm run dev` continues using the existing hosted configuration. Stop a currently running Vite process before switching modes, and open the URL printed by the new command.

Local Studio: http://127.0.0.1:54323
Local API: http://127.0.0.1:54321

A separate local admin was provisioned with the chosen administrator email. Its generated password is in `.ridevia-local/admin.txt`, which is ignored by Git and readable only by its owner. This password is for the local database only; the hosted account was not changed. Open `/#admin` on the local-mode frontend to sign in. No invitation email was sent.

The local database contains the four original demo cars plus the fifteen Philippine-fleet entries. Photos were not copied from hosted Storage. Local accounts, uploads, bookings and changes are independent from the hosted project. Calendly still needs internet.

All seven SQL regression suites passed locally in rolled-back transactions. Local API catalog reads and admin login/authorization passed. Browser layout and local photo uploads have not been manually checked.

To stop local services while retaining local state, use `npx supabase stop`. Do not use `--no-backup` or `db reset` unless intentionally discarding local data. Private backup/export and restore testing are separate remaining work.
