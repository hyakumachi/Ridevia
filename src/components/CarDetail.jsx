import CarPhoto from "./CarPhoto";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { manilaToday, rentalDays } from "../lib/booking";
const money = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value),
  );

export default function CarDetail({ id }) {
  const [record, setRecord] = useState(null);
  const [retry, setRetry] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = `${id}/${start}/${end}`;
  const valid = rentalDays(start, end) > 0 && start >= manilaToday();
  const current = quote?.key === key;

  useEffect(() => {
    let active = true;
    supabase
      .rpc("car_catalog")
      .then(({ data, error: loadError }) => {
        if (active)
          setRecord({
            id,
            car: data?.find((car) => car.id === id),
            error: Boolean(loadError),
          });
      })
      .catch(() => {
        if (active) setRecord({ id, error: true });
      });
    return () => {
      active = false;
    };
  }, [id, retry]);

  async function check(event) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    const params = { p_car_id: id, p_start_date: start, p_end_date: end };
    try {
      const [availability, price] = await Promise.all([
        supabase.rpc("check_availability", params),
        supabase.rpc("calculate_price", params),
      ]);
      if (availability.error || price.error) {
        setQuote(null);
        setError(
          "We couldn’t check this car. Please check your dates and try again.",
        );
      } else setQuote({ key, available: availability.data, price: price.data });
    } catch {
      setQuote(null);
      setError("We couldn’t check this car. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const car = record?.car;
  return (
    <div className="site">
      <header className="header">
        <a className="brand" href="#">
          ridevia<span>✦</span>
        </a>
        <a className="text-link" href="#">
          Back to cars
        </a>
      </header>
      <main className="detail-main">
        {record?.id !== id ? (
          <p role="status">Loading car…</p>
        ) : record.error ? (
          <section className="panel">
            <p className="error" role="alert">
              Unable to load this car.
            </p>
            <button onClick={() => setRetry((value) => value + 1)}>
              Retry
            </button>
          </section>
        ) : !car ? (
          <section className="panel">
            <h1 className="page-title">Car not found</h1>
            <p>This vehicle may have been removed from the fleet.</p>
            <a className="text-link" href="#">
              Browse cars
            </a>
          </section>
        ) : (
          <>
            <p className="eyebrow">FIND YOUR NEXT RIDE</p>
            <h1 className="page-title">{car.name}</h1>
            <div className="detail-grid">
              <section className="panel">
                <div className="car-art detail-photo">
                  <CarPhoto path={car.image_path} name={car.name} />
                </div>
                <h2>Vehicle details</h2>
                <dl>
                  <div>
                    <dt>Make</dt>
                    <dd>{car.make}</dd>
                  </div>
                  <div>
                    <dt>Model</dt>
                    <dd>{car.model}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{car.category.toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt>Daily rental rate</dt>
                    <dd>{money(car.daily_rate)}</dd>
                  </div>
                  <div>
                    <dt>Fleet status</dt>
                    <dd>
                      {car.maintenance
                        ? "Under maintenance"
                        : "Available — check your dates below"}
                    </dd>
                  </div>
                </dl>
                <p className="muted">
                  Rent for seven days or more and receive 10% off. The return
                  date is excluded.
                </p>
              </section>
              <section className="panel">
                <h2>Check your trip</h2>
                <form onSubmit={check}>
                  <fieldset disabled={busy}>
                    <label>
                      Pickup date
                      <input
                        type="date"
                        required
                        min={manilaToday()}
                        value={start}
                        onChange={(event) => {
                          setStart(event.target.value);
                          setError("");
                        }}
                      />
                    </label>
                    <label>
                      Return date
                      <input
                        type="date"
                        required
                        min={start || manilaToday()}
                        value={end}
                        onChange={(event) => {
                          setEnd(event.target.value);
                          setError("");
                        }}
                      />
                    </label>
                  </fieldset>
                  <button disabled={!valid || busy} type="submit">
                    {busy ? "Checking…" : "Check availability and price"}
                  </button>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  {current && (
                    <div className="detail-quote" role="status">
                      <h3>
                        {quote.available
                          ? "Available for your dates"
                          : "Unavailable for your dates"}
                      </h3>
                      <p>
                        {quote.price.rental_days} days ·{" "}
                        {quote.price.discount_percent}% discount
                      </p>
                      <strong>{money(quote.price.total_price)}</strong>
                      {quote.available && (
                        <a
                          className="button-link"
                          href={`#book/${id}?start=${start}&end=${end}`}
                        >
                          Book this car
                        </a>
                      )}
                      <p className="fine-print">
                        Availability and price are confirmed again when you
                        submit.
                      </p>
                    </div>
                  )}
                </form>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
