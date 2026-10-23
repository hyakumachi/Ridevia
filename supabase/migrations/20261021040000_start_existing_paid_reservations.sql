begin;
-- Bring reservations paid before automatic start into the same workflow.
update public.bookings set status='ongoing' where status='pending' and payment_status='paid';
commit;
