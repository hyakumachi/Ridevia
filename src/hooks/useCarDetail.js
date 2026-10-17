import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { manilaToday, rentalDays } from "../lib/booking";
export default function useCarDetail({ id }) {
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
      .rpc("public_cars_by_ids", { p_ids: [id] })
      .then(({ data, error: loadError }) => {
        if (active)
          setRecord({
            id,
            car: data?.find((car) => car.id === id),
            error: Boolean(loadError),
          });
      })
      .catch(() => {
        if (active)
          setRecord({
            id,
            error: true,
          });
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
    const params = {
      p_car_id: id,
      p_start_date: start,
      p_end_date: end,
    };
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
      } else
        setQuote({
          key,
          available: availability.data,
          price: price.data,
        });
    } catch {
      setQuote(null);
      setError("We couldn’t check this car. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const car = record?.car;
  return {
    record,
    id,
    setRetry,
    car,
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
  };
}
