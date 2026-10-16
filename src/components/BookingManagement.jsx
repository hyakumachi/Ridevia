import RentalReceipt from "./RentalReceipt";
import { canIssueReceipt } from "../lib/receipt";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
const money = (amount) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    amount,
  );

export default function BookingManagement() {
  const [rows, setRows] = useState([]);
  const [receiptRef, setReceiptRef] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [pickupError, setPickupError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [methods, setMethods] = useState({});
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("bookings")
      .select(
        "id,group_ref,start_date,end_date,rental_days,total_price,discount_percent,status,payment_status,payment_method,created_at,customers(full_name,email,phone,license_number),cars(name,plate_number)",
      )
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        setRows(data || []);
        setLoadError(
          fetchError ? "Unable to load bookings. Please retry." : "",
        );
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoadError("Unable to load bookings. Please retry.");
          setLoading(false);
        }
      });
    supabase.from("pickup_appointments").select("group_ref,pickup_at,status,review_reason,invitee_created_at")
      .order("invitee_created_at", { ascending: false }).then(({ data, error: fetchError }) => {
        if (active) { setPickups(data || []); setPickupError(fetchError ? "Pickup appointments could not be loaded. Reload bookings to retry." : ""); }
      }).catch(() => { if (active) setPickupError("Pickup appointments could not be loaded. Reload bookings to retry."); });
    return () => {
      active = false;
    };
  }, [reload]);

  function refresh() {
    setConfirming(null);
    setLoading(true);
    setReload((value) => value + 1);
  }
  async function change(group, action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data, error: updateError } = await supabase.rpc(
        "update_booking_group",
        {
          p_group_ref: group.ref,
          ...action,
        },
      );
      if (updateError || data !== group.rows.length) {
        setError(
          updateError?.code === "42501"
            ? "Your account cannot manage bookings. Check your admin access."
            : "The group change could not be confirmed. Reload bookings to check its current status before trying again.",
        );
        refresh();
        return;
      }
      setNotice("Booking group updated.");
      refresh();
    } catch {
      setError(
        "The change could not be confirmed. Reload bookings before trying again.",
      );
      refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const groups = Object.values(
    rows.reduce((result, row) => {
      result[row.group_ref] ||= { ref: row.group_ref, rows: [] };
      result[row.group_ref].rows.push(row);
      return result;
    }, {}),
  );
  if (receiptRef) return <RentalReceipt key={receiptRef} groupRef={receiptRef} onBack={() => { setReceiptRef(null); refresh(); }} />;
  return (
    <section aria-label="Booking management">
      <div className="section-heading">
        <div>
          <h2>Reservations</h2>
          <p>
            {groups.length} booking groups · Prices are fixed at reservation
            time.
          </p>
        </div>
        <button
          disabled={busy || loading}
          className="secondary-button"
          onClick={refresh}
        >
          Reload bookings
        </button>
      </div>
      {pickupError && <p role="alert" className="error">{pickupError}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="available-text">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Loading bookings…</p>
      ) : loadError ? (
        <p role="alert" className="error">
          {loadError} <button onClick={refresh}>Retry</button>
        </p>
      ) : groups.length === 0 ? (
        <div className="panel">
          <p>No reservations yet. Guest bookings will appear here.</p>
        </div>
      ) : (
        <div className="booking-groups">
          {groups.map((group) => {
            const first = group.rows[0];
            const everyStatus = (status) =>
              group.rows.every((row) => row.status === status);
            const unpaid = group.rows.every(
              (row) => row.payment_status === "unpaid",
            );
            const paid = group.rows.every(
              (row) => row.payment_status === "paid",
            );
            return (
              <article
                className="panel booking-group"
                key={group.ref}
                aria-label={`Booking group ${group.ref}`}
              >
                <h3 className="reference">Reference: {group.ref}</h3>
                <div className="pickup-summary">
                  <h4>Pickup appointments</h4>
                  {pickups.filter(pickup => pickup.group_ref === group.ref).length === 0 ? <p className="muted">No pickup appointment received yet.</p> : pickups.filter(pickup => pickup.group_ref === group.ref).map((pickup, index) => <p key={index} className={pickup.status === "needs_review" ? "error" : "muted"}>
                    {new Intl.DateTimeFormat("en-PH", {timeZone:"Asia/Manila", dateStyle:"medium", timeStyle:"short"}).format(new Date(pickup.pickup_at))} (Philippine Time) · {pickup.status.replaceAll("_", " ")}
                    {pickup.review_reason && <> · {pickup.review_reason}</>}
                  </p>)}
                  <p className="fine-print">Cancelling a pickup appointment does not cancel the car reservation or refund payment.</p>
                </div>
                <p>
                  <strong>
                    {first.customers?.full_name || "Customer unavailable"}
                  </strong>
                </p>
                <p className="muted">
                  {first.customers?.email} · {first.customers?.phone}
                </p>
                <p className="muted">
                  License: {first.customers?.license_number}
                </p>
                <p>
                  {first.start_date} → {first.end_date} · {first.rental_days}{" "}
                  days · Return date is exclusive
                </p>
                <ul className="booking-items">
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      <strong>{row.cars?.name || "Car unavailable"}</strong> ·{" "}
                      {row.cars?.plate_number}
                      <p>
                        {money(Number(row.total_price))} · {row.status} ·{" "}
                        {row.payment_status}
                        {row.payment_method ? ` (${row.payment_method})` : ""}
                      </p>
                      <span className="muted reference">
                        Booking ID: {row.id}
                        {row.discount_percent
                          ? ` · ${row.discount_percent}% discount`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <p>
                  <strong>
                    Group total:{" "}
                    {money(
                      group.rows.reduce(
                        (sum, row) => sum + Number(row.total_price),
                        0,
                      ),
                    )}
                  </strong>
                </p>
                <div className="row-actions">
                  {canIssueReceipt(group.rows) && <button disabled={busy} onClick={() => setReceiptRef(group.ref)}>View receipt</button>}
                  {everyStatus("pending") && (
                    <button
                      disabled={busy}
                      onClick={() => change(group, { p_status: "ongoing" })}
                    >
                      Start rental
                    </button>
                  )}
                  {everyStatus("ongoing") && (
                    <button
                      disabled={busy}
                      onClick={() => change(group, { p_status: "completed" })}
                    >
                      Complete rental
                    </button>
                  )}
                  {group.rows.every((row) =>
                    ["pending", "ongoing"].includes(row.status),
                  ) && (
                    <button
                      disabled={busy}
                      className="secondary-button"
                      onClick={() =>
                        setConfirming({
                          ref: group.ref,
                          action: { p_status: "cancelled" },
                          label: "Cancel reservation",
                        })
                      }
                    >
                      Cancel reservation
                    </button>
                  )}
                </div>
                {unpaid &&
                  !group.rows.some((row) => row.status === "cancelled") && (
                    <div className="manual-payment">
                      <label>
                        Payment method
                        <select
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
                        </select>
                      </label>
                      <button
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
                      </button>
                      <p className="fine-print">
                        Record only money already received. This does not charge
                        the customer.
                      </p>
                    </div>
                  )}
                {everyStatus("cancelled") && paid && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      setConfirming({
                        ref: group.ref,
                        action: { p_payment_status: "refunded" },
                        label: "Record refund",
                      })
                    }
                  >
                    Record refund
                  </button>
                )}
                {confirming?.ref === group.ref && (
                  <div className="delete-confirmation">
                    <h3>
                      {confirming.label} for all {group.rows.length} cars?
                    </h3>
                    <p>
                      {confirming.action.p_payment_status === "refunded"
                        ? "Confirm only after returning the money to the customer."
                        : confirming.action.p_payment_status === "paid"
                          ? `Confirm receipt of ${money(group.rows.reduce((sum, row) => sum + Number(row.total_price), 0))} via ${confirming.action.p_payment_method}.`
                          : "This releases the reserved dates for every car in this group."}
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => change(group, confirming.action)}
                    >
                      Confirm {confirming.label.toLowerCase()}
                    </button>
                    <button
                      disabled={busy}
                      className="secondary-button"
                      onClick={() => setConfirming(null)}
                    >
                      Keep unchanged
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
