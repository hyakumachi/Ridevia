import SiteLayout from "../components/layout/SiteLayout";
import BookingConfirmation from "../components/booking/BookingConfirmation";
import DateSelection from "../components/booking/DateSelection";
import CarCatalog from "../components/booking/CarCatalog";
import GuestSummary from "../components/booking/GuestSummary";
import useGuestBooking from "../hooks/useGuestBooking";
export default function GuestBooking(props) {
  const {
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
  } = useGuestBooking(props);
  return (
    <SiteLayout showFooter>
      <main className="py-8">
        <h1 className="sr-only">Reserve your ride</h1>
        {confirmation ? (
          <BookingConfirmation
            confirmation={confirmation}
            setConfirmation={setConfirmation}
            setRefreshDates={setRefreshDates}
          />
        ) : (
          <form
            className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]"
            onSubmit={submit}
          >
            <div className="min-w-0">
              <DateSelection
                start={start}
                submitting={submitting}
                setStart={setStart}
                setAvailabilityError={setAvailabilityError}
                end={end}
                setEnd={setEnd}
                validDates={validDates}
                days={days}
                checked={checked}
                availabilityError={availabilityError}
                setRefreshDates={setRefreshDates}
              />
              <CarCatalog
                controls={catalogControls}
                loading={loading}
                catalogError={catalogError}
                setLoading={setLoading}
                setReload={setReload}
                cars={cars}
                checked={checked}
                availability={availability}
                selected={selected}
                submitting={submitting}
                toggle={toggle}
              />
            </div>
            <GuestSummary
              chosen={chosen}
              onRemove={toggle}
              days={days}
              submitting={submitting}
              guest={guest}
              setGuest={setGuest}
              unavailable={unavailable}
              error={error}
              canSubmit={canSubmit}
            />
          </form>
        )}
      </main>
    </SiteLayout>
  );
}
