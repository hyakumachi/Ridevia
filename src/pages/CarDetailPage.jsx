import SiteLayout from "../components/layout/SiteLayout";
import Button from "../components/ui/Button";
import Panel from "../components/ui/Panel";
import CarSpecifications from "../components/cars/CarSpecifications";
import TripQuoteForm from "../components/cars/TripQuoteForm";
import useCarDetail from "../hooks/useCarDetail";
export default function CarDetailPage(props) {
  const {
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
  } = useCarDetail(props);
  return (
    <SiteLayout backLabel="Back to cars">
      <main className="py-10">
        {record?.id !== id ? (
          <p role="status" className="my-2 text-sm leading-relaxed">
            Loading car…
          </p>
        ) : record.error ? (
          <Panel>
            <p
              className="my-3 text-sm leading-relaxed text-danger"
              role="alert"
            >
              Unable to load this car.
            </p>
            <Button onClick={() => setRetry((value) => value + 1)}>
              Retry
            </Button>
          </Panel>
        ) : !car ? (
          <Panel>
            <h1 className="my-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Car not found
            </h1>
            <p className="my-2 text-sm leading-relaxed">
              This vehicle may have been removed from the fleet.
            </p>
            <a className="underline underline-offset-4" href="#">
              Browse cars
            </a>
          </Panel>
        ) : (
          <>
            <p className="mb-3 text-xs font-bold tracking-[0.15em] text-accent">
              FIND YOUR NEXT RIDE
            </p>
            <h1 className="my-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {car.name}
            </h1>
            <div className="grid min-w-0 gap-6 md:grid-cols-2">
              <CarSpecifications car={car} />
              <TripQuoteForm
                check={check}
                busy={busy}
                start={start}
                setStart={setStart}
                setError={setError}
                end={end}
                setEnd={setEnd}
                valid={valid}
                error={error}
                current={current}
                quote={quote}
                id={id}
              />
            </div>
          </>
        )}
      </main>
    </SiteLayout>
  );
}
