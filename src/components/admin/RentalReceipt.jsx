import Button from "../ui/Button";
import { money } from "../../lib/format";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { canIssueReceipt, receiptTotal } from "../../lib/receipt";
export default function RentalReceipt({ groupRef, onBack }) {
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    supabase
      .from("bookings")
      .select(
        "id,group_ref,start_date,end_date,rental_days,daily_rate,discount_percent,total_price,status,payment_status,payment_method,customers(full_name),cars(name,plate_number)",
      )
      .eq("group_ref", groupRef)
      .order("id")
      .then(({ data, error }) => {
        if (active)
          setResult({
            rows: data || [],
            error: Boolean(error),
          });
      })
      .catch(() => {
        if (active)
          setResult({
            rows: [],
            error: true,
          });
      });
    return () => {
      active = false;
    };
  }, [groupRef, retry]);
  const rows = result?.rows || [];
  const eligible = result && !result.error && canIssueReceipt(rows);
  return (
    <section className="w-full" aria-label="Rental receipt">
      <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
        <Button onClick={onBack} variant="secondary">
          Back to booking management
        </Button>
        {eligible && (
          <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        )}
      </div>
      {!result ? (
        <p role="status" className="my-2 text-sm leading-relaxed">
          Checking receipt eligibility…
        </p>
      ) : result.error ? (
        <p role="alert" className="my-3 text-sm leading-relaxed text-danger">
          Receipt could not be loaded.{" "}
          <Button
            onClick={() => {
              setResult(null);
              setRetry((value) => value + 1);
            }}
          >
            Retry receipt
          </Button>
        </p>
      ) : !eligible ? (
        <p role="alert" className="my-2 text-sm leading-relaxed">
          A receipt is available only when every car in this booking group is
          completed and paid. The group may be unavailable or your access may
          have changed.
        </p>
      ) : (
        <article className="mx-auto w-full max-w-4xl rounded-xl border border-line bg-white p-5 sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
          <header className="flex flex-wrap items-start justify-between gap-5">
            <span className="text-3xl font-extrabold tracking-tight text-ink [&>span]:ml-1 [&>span]:text-accent">
              ridevia<span>✦</span>
            </span>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                Rental receipt
              </h1>
              <p className="my-2 text-sm leading-relaxed">
                Completed · Paid · PHP
              </p>
            </div>
          </header>
          <dl className="my-6 space-y-4 border-b border-line pb-5">
            <div>
              <dt className="text-xs text-muted">Booking reference</dt>
              <dd className="break-all">{groupRef}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Customer</dt>
              <dd className="mt-2 font-semibold">
                {rows[0].customers?.full_name || "Customer unavailable"}
              </dd>
            </div>
          </dl>
          {rows.map((row) => {
            const subtotalCents =
              Math.round(Number(row.daily_rate) * 100) * row.rental_days;
            const discount =
              (subtotalCents - Math.round(Number(row.total_price) * 100)) / 100;
            return (
              <section
                key={row.id}
                className="mt-6 break-inside-avoid border-t border-line pt-6 [&_dl]:my-3 [&_dl>div]:flex [&_dl>div]:flex-wrap [&_dl>div]:justify-between [&_dl>div]:gap-4 [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:text-right"
              >
                <h2 className="mb-3 text-xl font-bold tracking-tight">
                  {row.cars?.name || "Car unavailable"}
                </h2>
                <p className="my-2 text-sm leading-relaxed">
                  Plate: {row.cars?.plate_number || "—"}
                </p>
                <p className="break-all">Booking ID: {row.id}</p>
                <p className="my-2 text-sm leading-relaxed">
                  {row.start_date} → {row.end_date} · {row.rental_days} rental
                  days
                </p>
                <dl className="my-6 [&>div]:border-b [&>div]:border-line [&>div]:py-3">
                  <div>
                    <dt className="text-xs text-muted">Daily rate × days</dt>
                    <dd className="mt-2 font-semibold">
                      {money(row.daily_rate)} × {row.rental_days} ={" "}
                      {money(subtotalCents / 100)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">
                      Discount ({row.discount_percent}%)
                    </dt>
                    <dd className="mt-2 font-semibold">{money(discount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Amount paid</dt>
                    <dd className="mt-2 font-semibold">
                      {money(row.total_price)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Payment method</dt>
                    <dd className="mt-2 font-semibold">
                      {row.payment_method?.toUpperCase() || "Not recorded"}
                    </dd>
                  </div>
                </dl>
              </section>
            );
          })}
          <p className="mt-6 border-t-2 border-ink pt-5 text-right text-xl">
            Total paid: <strong>{money(receiptTotal(rows))}</strong>
          </p>
          <p className="text-sm leading-relaxed text-muted">
            The return date is excluded from the rental duration.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Thank you for choosing Ridevia.
          </p>
        </article>
      )}
    </section>
  );
}
