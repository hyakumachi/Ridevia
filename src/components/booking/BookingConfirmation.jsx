import Button from "../ui/Button";
import Panel from "../ui/Panel";
import { money } from "../../lib/format";
import PickupScheduler from "./PickupScheduler";
export default function BookingConfirmation({
  confirmation,
  setConfirmation,
  setRefreshDates,
}) {
  return (
    <Panel className="mb-10 max-w-3xl">
      <p className="mb-3 text-xs font-bold tracking-[0.15em] text-accent">
        RESERVATION RECEIVED
      </p>
      <h2 className="mb-3 text-xl font-bold tracking-tight">
        You’re one step closer.
      </h2>
      <p className="my-2 text-sm leading-relaxed">
        Your reservation is pending. Payment has not been collected.
      </p>
      <p className="my-2 text-sm leading-relaxed">
        <strong>Pay at pickup.</strong> Bring your booking reference. Ridevia
        staff will record your payment after receiving it.
      </p>
      <dl className="my-6 [&>div]:border-b [&>div]:border-line [&>div]:py-3">
        <div>
          <dt className="text-xs text-muted">Booking reference</dt>
          <dd className="break-all">{confirmation.group_ref}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Rental dates</dt>
          <dd className="mt-2 font-semibold">
            {confirmation.start} → {confirmation.end}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Cars</dt>
          <dd className="mt-2 font-semibold">{confirmation.bookings.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Total rental price</dt>
          <dd className="mt-2 font-semibold">
            {money(confirmation.total_price)}
          </dd>
        </div>
      </dl>
      <p className="my-2 text-sm leading-relaxed">
        Save your reference for follow-up with Ridevia.
      </p>
      <PickupScheduler reservation={confirmation} />
      <Button
        onClick={() => {
          setConfirmation(null);
          setRefreshDates((value) => value + 1);
        }}
      >
        Make another reservation
      </Button>
    </Panel>
  );
}
