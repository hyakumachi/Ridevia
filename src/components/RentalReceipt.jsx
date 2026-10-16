import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { canIssueReceipt, receiptTotal } from "../lib/receipt";
const money = value => new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP" }).format(Number(value));
export default function RentalReceipt({ groupRef, onBack }) {
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    supabase.from("bookings").select("id,group_ref,start_date,end_date,rental_days,daily_rate,discount_percent,total_price,status,payment_status,payment_method,customers(full_name),cars(name,plate_number)")
      .eq("group_ref", groupRef).order("id").then(({ data, error }) => {
        if (active) setResult({ rows: data || [], error: Boolean(error) });
      }).catch(() => { if (active) setResult({ rows:[], error:true }); });
    return () => { active = false; };
  }, [groupRef, retry]);
  const rows = result?.rows || [];
  const eligible = result && !result.error && canIssueReceipt(rows);
  return <section className="receipt-view" aria-label="Rental receipt">
    <div className="row-actions receipt-controls">
      <button className="secondary-button" onClick={onBack}>Back to booking management</button>
      {eligible && <button onClick={() => window.print()}>Print / Save as PDF</button>}
    </div>
    {!result ? <p role="status">Checking receipt eligibility…</p> : result.error ? <p role="alert" className="error">Receipt could not be loaded. <button onClick={() => { setResult(null); setRetry(value => value + 1); }}>Retry receipt</button></p> : !eligible ?
      <p role="alert">A receipt is available only when every car in this booking group is completed and paid. The group may be unavailable or your access may have changed.</p> :
      <article className="rental-receipt">
        <header className="receipt-heading"><span className="brand">ridevia<span>✦</span></span><div><h1>Rental receipt</h1><p>Completed · Paid · PHP</p></div></header>
        <dl className="receipt-details">
          <div><dt>Booking reference</dt><dd className="reference">{groupRef}</dd></div>
          <div><dt>Customer</dt><dd>{rows[0].customers?.full_name || "Customer unavailable"}</dd></div>
        </dl>
        {rows.map(row => {
          const subtotalCents = Math.round(Number(row.daily_rate) * 100) * row.rental_days;
          const discount = (subtotalCents - Math.round(Number(row.total_price) * 100)) / 100;
          return <section key={row.id} className="receipt-item">
            <h2>{row.cars?.name || "Car unavailable"}</h2>
            <p>Plate: {row.cars?.plate_number || "—"}</p>
            <p className="reference">Booking ID: {row.id}</p>
            <p>{row.start_date} → {row.end_date} · {row.rental_days} rental days</p>
            <dl>
              <div><dt>Daily rate × days</dt><dd>{money(row.daily_rate)} × {row.rental_days} = {money(subtotalCents / 100)}</dd></div>
              <div><dt>Discount ({row.discount_percent}%)</dt><dd>{money(discount)}</dd></div>
              <div><dt>Amount paid</dt><dd>{money(row.total_price)}</dd></div>
              <div><dt>Payment method</dt><dd>{row.payment_method?.toUpperCase() || "Not recorded"}</dd></div>
            </dl>
          </section>;
        })}
        <p className="receipt-total">Total paid: <strong>{money(receiptTotal(rows))}</strong></p>
        <p className="muted">The return date is excluded from the rental duration.</p>
        <p className="muted">Thank you for choosing Ridevia.</p>
      </article>}
  </section>;
}
