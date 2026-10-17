import Button from "../ui/Button";
import Input from "../ui/Input";
import Field from "../ui/Field";
import Panel from "../ui/Panel";
import { manilaToday } from "../../lib/booking";
import { money } from "../../lib/format";
export default function TripQuoteForm({
  check,
  busy,
  start,
  setStart,
  setError,
  end,
  setEnd,
  valid,
  error,
  current,
  quote,
  id,
}) {
  return (
    <Panel>
      <h2 className="mb-3 text-xl font-bold tracking-tight">Check your trip</h2>
      <form onSubmit={check}>
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          <Field>
            Pickup date
            <Input
              type="date"
              required
              min={manilaToday()}
              value={start}
              onChange={(event) => {
                setStart(event.target.value);
                setError("");
              }}
            />
          </Field>
          <Field>
            Return date
            <Input
              type="date"
              required
              min={start || manilaToday()}
              value={end}
              onChange={(event) => {
                setEnd(event.target.value);
                setError("");
              }}
            />
          </Field>
        </fieldset>
        <Button disabled={!valid || busy} type="submit">
          {busy ? "Checking…" : "Check availability and price"}
        </Button>
        {error && (
          <p className="my-3 text-sm leading-relaxed text-danger" role="alert">
            {error}
          </p>
        )}
        {current && (
          <div
            className="mt-6 border-t border-line pt-6 [&>strong]:my-5 [&>strong]:block [&>strong]:text-3xl"
            role="status"
          >
            <h3 className="mb-3 text-base font-semibold">
              {quote.available
                ? "Available for your dates"
                : "Unavailable for your dates"}
            </h3>
            <p className="my-2 text-sm leading-relaxed">
              {quote.price.rental_days} days · {quote.price.discount_percent}%
              discount
            </p>
            <strong>{money(quote.price.total_price)}</strong>
            {quote.available && (
              <a
                className="inline-flex rounded-lg bg-accent px-5 py-3 font-semibold text-white"
                href={`#book/${id}?start=${start}&end=${end}`}
              >
                Book this car
              </a>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Availability and price are confirmed again when you submit.
            </p>
          </div>
        )}
      </form>
    </Panel>
  );
}
