import Button from "../ui/Button";
import Select from "../ui/Select";
import Field from "../ui/Field";
import Panel from "../ui/Panel";
import BookingActions from "./BookingActions";
import { money } from "../../lib/format";
export default function BookingGroupCard({
  group,
  busy,
  setReceiptRef,
  change,
  setConfirming,
  methods,
  setMethods,
  confirming,
}) {
  const first = group.rows[0];
  const everyStatus = (status) =>
    group.rows.every((row) => row.status === status);
  const unpaid = group.rows.every((row) => row.payment_status === "unpaid");
  const paid = group.rows.every((row) => row.payment_status === "paid");
  return (
    <Panel
      className="w-full max-w-4xl [overflow-wrap:anywhere]"
      aria-label={`Booking group ${group.ref}`}
      as="article"
    >
      <h3 className="break-all">Reference: {group.ref}</h3>
      <p className="my-2 text-sm leading-relaxed">
        <strong>{first.customers?.full_name || "Customer unavailable"}</strong>
      </p>
      <p className="text-sm leading-relaxed text-muted">
        {first.customers?.email} · {first.customers?.phone}
      </p>
      <p className="text-sm leading-relaxed text-muted">
        License: {first.customers?.license_number}
      </p>
      <p className="my-2 text-sm leading-relaxed">
        {first.start_date} → {first.end_date} · {first.rental_days} days ·
        Return date is exclusive
      </p>
      <ul className="my-4 list-none p-0 [&>li]:border-b [&>li]:border-line [&>li]:py-4 [&_p]:my-2">
        {group.rows.map((row) => (
          <li key={row.id}>
            <strong>{row.cars?.name || "Car unavailable"}</strong> ·{" "}
            {row.cars?.plate_number}
            <p className="my-2 text-sm leading-relaxed">
              {money(Number(row.total_price))} · {row.status} ·{" "}
              {row.payment_status}
              {row.payment_method ? ` (${row.payment_method})` : ""}
            </p>
            <span className="text-sm leading-relaxed text-muted break-all">
              Booking ID: {row.id}
              {row.discount_percent
                ? ` · ${row.discount_percent}% discount`
                : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="my-2 text-sm leading-relaxed">
        <strong>
          Group total:{" "}
          {money(
            group.rows.reduce((sum, row) => sum + Number(row.total_price), 0),
          )}
        </strong>
      </p>
      <BookingActions
        group={group}
        busy={busy}
        setReceiptRef={setReceiptRef}
        everyStatus={everyStatus}
        change={change}
        setConfirming={setConfirming}
      />
      {unpaid && !group.rows.some((row) => row.status === "cancelled") && (
        <div className="mt-6 max-w-sm [&>button]:mt-3">
          <Field>
            Payment method
            <Select
              disabled={busy}
              value={methods[group.ref] || "cash"}
              onChange={(event) =>
                setMethods((value) => ({
                  ...value,
                  [group.ref]: event.target.value,
                }))
              }
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Button
            disabled={busy}
            onClick={() =>
              setConfirming({
                ref: group.ref,
                action: {
                  p_payment_status: "paid",
                  p_payment_method: methods[group.ref] || "cash",
                },
                label: "Record payment",
              })
            }
          >
            Record payment
          </Button>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Record only money already received. Confirming payment automatically
            starts pending rentals. This does not charge the customer.
          </p>
        </div>
      )}
      {everyStatus("cancelled") && paid && (
        <Button
          disabled={busy}
          onClick={() =>
            setConfirming({
              ref: group.ref,
              action: {
                p_payment_status: "refunded",
              },
              label: "Record refund",
            })
          }
        >
          Record refund
        </Button>
      )}
      {confirming?.ref === group.ref && (
        <div className="mt-6 space-y-3 rounded-xl bg-warm p-5 [&>button]:mr-2">
          <h3 className="mb-3 text-base font-semibold">
            {confirming.label} for all {group.rows.length} cars?
          </h3>
          <p className="my-2 text-sm leading-relaxed">
            {confirming.action.p_payment_status === "refunded"
              ? "Confirm only after returning the money to the customer."
              : confirming.action.p_payment_status === "paid"
                ? `Confirm receipt of ${money(group.rows.reduce((sum, row) => sum + Number(row.total_price), 0))} via ${confirming.action.p_payment_method}.`
                : "This releases the reserved dates for every car in this group."}
          </p>
          <Button
            disabled={busy}
            onClick={() => change(group, confirming.action)}
          >
            Confirm {confirming.label.toLowerCase()}
          </Button>
          <Button
            disabled={busy}
            onClick={() => setConfirming(null)}
            variant="secondary"
          >
            Keep unchanged
          </Button>
        </div>
      )}
    </Panel>
  );
}
