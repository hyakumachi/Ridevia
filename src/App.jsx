import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { estimatePrice, manilaToday, rentalDays } from "./lib/booking";
import "./App.css";

const money = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value),
  );
const emptyGuest = { fullName: "", email: "", phone: "", license: "" };

function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [guest, setGuest] = useState(emptyGuest);
  const [availability, setAvailability] = useState(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [refreshDates, setRefreshDates] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const submittingRef = useRef(false);
  const days = rentalDays(start, end);
  const validDates = days > 0 && start >= manilaToday();
  const chosen = cars.filter((car) => selected.includes(car.id));
  const datesKey = `${start}/${end}/${refreshDates}`;
  const checked = availability?.key === datesKey && validDates;
  const unavailable = chosen.some(
    (car) => car.maintenance || (checked && !availability.cars[car.id]),
  );
  const canSubmit =
    checked &&
    chosen.length > 0 &&
    chosen.length <= 20 &&
    !unavailable &&
    !submitting;

  useEffect(() => {
    let active = true;
    supabase
      .rpc("car_catalog")
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setCars(data || []);
        setCatalogError(
          loadError ? "We couldn’t load the cars. Please try again." : "",
        );
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setCatalogError("We couldn’t load the cars. Please try again.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!validDates) return;
    let active = true;
    supabase
      .rpc("car_availability", { p_start_date: start, p_end_date: end })
      .then(({ data, error: checkError }) => {
        if (!active) return;
        setAvailabilityError(
          checkError
            ? "We couldn’t check these dates. Change the dates or try again."
            : "",
        );
        setAvailability(
          checkError
            ? null
            : {
                key: datesKey,
                cars: Object.fromEntries(
                  data.map((car) => [car.car_id, car.available]),
                ),
              },
        );
      })
      .catch(() => {
        if (active) {
          setAvailability(null);
          setAvailabilityError(
            "We couldn’t check these dates. Please try again.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [start, end, validDates, datesKey]);

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || submittingRef.current) return;
    if (
      !guest.fullName.trim() ||
      !guest.license.trim() ||
      guest.phone.trim().length < 7
    ) {
      setError(
        "Please enter your full name, phone number, and driver’s license number.",
      );
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const { data, error: submitError } = await supabase.rpc(
        "submit_booking",
        {
          p_car_ids: selected,
          p_start_date: start,
          p_end_date: end,
          p_full_name: guest.fullName.trim(),
          p_email: guest.email.trim(),
          p_phone: guest.phone.trim(),
          p_license_number: guest.license.trim(),
        },
      );
      if (submitError) {
        if (submitError.code === "23P01" || submitError.code === "23514") {
          setError(
            "A selected car is no longer available. Please choose another car or different dates.",
          );
          setRefreshDates((value) => value + 1);
        } else if (["22023", "23502"].includes(submitError.code)) {
          setError(
            "Please check your dates and contact details, then try again.",
          );
        } else {
          setError(
            "We couldn’t confirm your reservation. Please contact Ridevia before submitting again.",
          );
        }
        return;
      }
      setConfirmation({ ...data, start, end });
      setGuest(emptyGuest);
      setSelected([]);
    } catch {
      setError(
        "We couldn’t confirm your reservation. Please contact Ridevia before submitting again.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function toggle(id) {
    setError("");
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  }

  return (
    <div className="site">
      <header className="header">
        <a className="brand" href="#">
          ridevia<span>✦</span>
        </a>
        <span className="header-note">Your next trip starts here</span>
      </header>
      <main>
        <section className="hero-copy">
          <p className="eyebrow">A LITTLE FREEDOM. A NEW DESTINATION.</p>
          <h1>
            Good trips start
            <br />
            with the right ride.
          </h1>
          <p>
            Choose your car, pick your dates, and make room for the journey.
          </p>
          <div className="hero-tags">
            <span>Daily rentals</span>
            <span>Multi-car reservations</span>
            <span>10% off for 7+ days</span>
          </div>
        </section>
        {confirmation ? (
          <section className="confirmation panel" role="status">
            <p className="eyebrow">RESERVATION RECEIVED</p>
            <h2>You’re one step closer.</h2>
            <p>Your reservation is pending. Payment has not been collected.</p>
            <dl>
              <div>
                <dt>Booking reference</dt>
                <dd className="reference">{confirmation.group_ref}</dd>
              </div>
              <div>
                <dt>Rental dates</dt>
                <dd>
                  {confirmation.start} → {confirmation.end}
                </dd>
              </div>
              <div>
                <dt>Cars</dt>
                <dd>{confirmation.bookings.length}</dd>
              </div>
              <div>
                <dt>Total rental price</dt>
                <dd>{money(confirmation.total_price)}</dd>
              </div>
            </dl>
            <p>Save your reference for follow-up with Ridevia.</p>
            <button
              onClick={() => {
                setConfirmation(null);
                setRefreshDates((value) => value + 1);
              }}
            >
              Make another reservation
            </button>
          </section>
        ) : (
          <form className="booking-layout" onSubmit={submit}>
            <div className="catalog">
              <section className="panel date-panel">
                <div className="section-heading">
                  <span className="step">01</span>
                  <div>
                    <h2>Pick your dates</h2>
                    <p>The return date is excluded from the rental period.</p>
                  </div>
                </div>
                <div className="date-grid">
                  <label>
                    Pickup date
                    <input
                      type="date"
                      value={start}
                      min={manilaToday()}
                      required
                      disabled={submitting}
                      onChange={(event) => {
                        setStart(event.target.value);
                        setAvailabilityError("");
                      }}
                    />
                  </label>
                  <label>
                    Return date
                    <input
                      type="date"
                      value={end}
                      min={start || manilaToday()}
                      required
                      disabled={submitting}
                      onChange={(event) => {
                        setEnd(event.target.value);
                        setAvailabilityError("");
                      }}
                    />
                  </label>
                </div>
                <p className="date-status" aria-live="polite">
                  {validDates
                    ? `${days} rental day${days === 1 ? "" : "s"}${days >= 7 ? " · 10% discount included" : ""}`
                    : start && end
                      ? "Choose a return date after pickup, with no past dates."
                      : "Choose both dates to check availability."}
                </p>
                {validDates && !checked && !availabilityError && (
                  <p role="status">Checking availability…</p>
                )}
                {validDates && availabilityError && (
                  <div role="alert" className="error">
                    {availabilityError}{" "}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setAvailabilityError("");
                        setRefreshDates((value) => value + 1);
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </section>
              <section className="cars-section">
                <div className="section-heading">
                  <span className="step">02</span>
                  <div>
                    <h2>Find your ride</h2>
                    <p>
                      Select one or more cars. Inventory below is for
                      demonstration.
                    </p>
                  </div>
                </div>
                {loading ? (
                  <p role="status">Loading cars…</p>
                ) : catalogError ? (
                  <div className="error" role="alert">
                    {catalogError}{" "}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setLoading(true);
                        setReload((value) => value + 1);
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : cars.length === 0 ? (
                  <p>No cars are listed yet. Please check back soon.</p>
                ) : (
                  <div className="car-grid">
                    {cars.map((car, index) => {
                      const blocked =
                        car.maintenance ||
                        (checked && !availability.cars[car.id]);
                      const isSelected = selected.includes(car.id);
                      return (
                        <label
                          key={car.id}
                          className={`car-card ${isSelected ? "selected" : ""} ${blocked ? "unavailable" : ""}`}
                        >
                          <div
                            className={`car-art tone-${index % 3}`}
                            aria-hidden="true"
                          >
                            <svg viewBox="0 0 240 100">
                              <path
                                d="M30 65 45 43h39l22-23h52l28 25 27 7 9 25H25z"
                                fill="currentColor"
                              />
                              <path
                                d="m106 25-19 22h84l-19-22z"
                                fill="#dff2ef"
                              />
                              <circle cx="65" cy="76" r="16" fill="#173b3d" />
                              <circle cx="185" cy="76" r="16" fill="#173b3d" />
                              <circle cx="65" cy="76" r="7" fill="#f2f5f2" />
                              <circle cx="185" cy="76" r="7" fill="#f2f5f2" />
                            </svg>
                            <span className="car-badge">
                              {car.maintenance
                                ? "Maintenance"
                                : blocked
                                  ? "Unavailable for dates"
                                  : checked
                                    ? "Available for dates"
                                    : "Check dates"}
                            </span>
                          </div>
                          <div className="car-details">
                            <h3>{car.name}</h3>
                            <div className="car-bottom">
                              <p>
                                <strong>{money(car.daily_rate)}</strong>
                                <span> / day</span>
                              </p>
                              <input
                                type="checkbox"
                                aria-label={`Select ${car.name}`}
                                checked={isSelected}
                                disabled={
                                  submitting || (blocked && !isSelected)
                                }
                                onChange={() => toggle(car.id)}
                              />
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
            <aside className="panel summary">
              <div className="section-heading">
                <span className="step">03</span>
                <div>
                  <h2>Make it yours</h2>
                  <p>Your reservation details</p>
                </div>
              </div>
              <div className="price-summary">
                <span>
                  {chosen.length} car{chosen.length === 1 ? "" : "s"} · {days}{" "}
                  day{days === 1 ? "" : "s"}
                </span>
                <strong>{money(estimatePrice(chosen, days))}</strong>
                <small>
                  Estimated rental total{days >= 7 ? " · 10% discount" : ""}.
                  Final price confirmed on submission.
                </small>
              </div>
              <fieldset disabled={submitting}>
                <legend className="sr-only">Guest details</legend>
                {[
                  ["fullName", "Full name", "text", "name", 120],
                  ["email", "Email address", "email", "email", 254],
                  ["phone", "Phone number", "tel", "tel", 30],
                  ["license", "Driver’s license number", "text", "off", 60],
                ].map(([key, title, type, autoComplete, maxLength]) => (
                  <label key={key}>
                    {title}
                    <input
                      type={type}
                      autoComplete={autoComplete}
                      required
                      maxLength={maxLength}
                      minLength={key === "phone" ? 7 : 1}
                      value={guest[key]}
                      onChange={(event) =>
                        setGuest((value) => ({
                          ...value,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </fieldset>
              {unavailable && (
                <p className="error" role="alert">
                  Remove unavailable cars or choose different dates.
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="submit-button"
                type="submit"
                disabled={!canSubmit}
              >
                {submitting ? "Submitting reservation…" : "Reserve your ride →"}
              </button>
              <p className="fine-print">
                Your reservation starts as pending. No payment is collected
                here. Your contact and license details are shared only with
                Ridevia’s authorized staff.
              </p>
            </aside>
          </form>
        )}
      </main>
      <footer>
        <span className="brand">
          ridevia<span>✦</span>
        </span>
        <p>A ride for wherever life takes you.</p>
      </footer>
    </div>
  );
}
export default App;
