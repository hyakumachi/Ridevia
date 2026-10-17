import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { manilaToday, rentalDays } from "../lib/booking";
const emptyGuest = {
  fullName: "",
  email: "",
  phone: "",
  license: "",
};
export default function useGuestBooking({
  initialCarId = null,
  initialStart = "",
  initialEnd = "",
}) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [reload, setReload] = useState(0);
  const [chosen, setChosen] = useState([]);
  const selected = chosen.map((car) => car.id);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("name");
  const [catalogPage, setCatalogPage] = useState({ page: 1, total: 0 });
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
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
  const availabilityIds = [
    ...new Set([...cars.map((car) => car.id), ...selected]),
  ].sort();
  const idsKey = availabilityIds.join(",");
  const datesKey = `${start}/${end}/${refreshDates}/${idsKey}`;
  const checked = validDates && (!idsKey || availability?.key === datesKey);
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
      .rpc("car_catalog_page", {
        p_page: page,
        p_page_size: 6,
        p_category: category || null,
        p_sort: sort,
      })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setCars(data?.cars || []);
        setCatalogPage(data || { page: 1, total: 0 });
        if (data?.page && data.page !== page) setPage(data.page);
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
  }, [reload, page, category, sort]);
  useEffect(() => {
    if (!initialCarId) return;
    let active = true;
    supabase
      .rpc("public_cars_by_ids", { p_ids: [initialCarId] })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError || !data?.length)
          setError("That car is unavailable. Please choose from the catalog.");
        else setChosen((items) => (items.length ? items : data));
      })
      .catch(() => {
        if (active)
          setError(
            "Unable to load the selected car. Please choose from the catalog.",
          );
      });
    return () => {
      active = false;
    };
  }, [initialCarId]);
  useEffect(() => {
    if (!validDates || !idsKey) return;
    let active = true;
    supabase
      .rpc("car_availability_for_ids", {
        p_ids: idsKey.split(","),
        p_start_date: start,
        p_end_date: end,
      })
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
  }, [start, end, validDates, datesKey, idsKey]);
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
      setConfirmation({
        ...data,
        start,
        end,
        guestName: guest.fullName.trim(),
        guestEmail: guest.email.trim(),
      });
      setGuest(emptyGuest);
      setChosen([]);
    } catch {
      setError(
        "We couldn’t confirm your reservation. Please contact Ridevia before submitting again.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  function toggle(car) {
    setError("");
    if (!selected.includes(car.id) && chosen.length >= 20) {
      setError("Select up to 20 cars per reservation.");
      return;
    }
    setChosen((items) =>
      items.some((item) => item.id === car.id)
        ? items.filter((item) => item.id !== car.id)
        : items.length < 20
          ? [...items, car]
          : items,
    );
  }
  function changePage(value) {
    if (value === page) return;
    setLoading(true);
    setPage(value);
  }
  const catalogControls = {
    page: catalogPage.page,
    pageSize: 6,
    total: catalogPage.total,
    category,
    sort,
    onPage: changePage,
    onCategory: (value) => {
      if (value === category) return;
      setLoading(true);
      setPage(1);
      setCategory(value);
    },
    onSort: (value) => {
      if (value === sort) return;
      setLoading(true);
      setPage(1);
      setSort(value);
    },
  };
  return {
    catalogControls,
    confirmation,
    setConfirmation,
    setRefreshDates,
    submit,
    start,
    submitting,
    setStart,
    setAvailabilityError,
    end,
    setEnd,
    validDates,
    days,
    checked,
    availabilityError,
    loading,
    catalogError,
    setLoading,
    setReload,
    cars,
    availability,
    selected,
    toggle,
    chosen,
    guest,
    setGuest,
    unavailable,
    error,
    canSubmit,
  };
}
