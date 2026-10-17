import Pagination from "../ui/Pagination";
import Button from "../ui/Button";
import Panel from "../ui/Panel";
import CarPhoto from "../cars/CarPhoto";
import { money } from "../../lib/format";
export default function FleetList({
  pagination,
  cars,
  loading,
  loadError,
  refresh,
  busy,
  edit,
  setRemoving,
  setError,
  setNotice,
  removing,
  remove,
}) {
  return (
    <Panel>
      <div className="mb-6 flex flex-wrap items-start gap-3 [&_p]:text-sm [&_p]:text-muted">
        <div>
          <h2 className="mb-3 text-xl font-bold tracking-tight">Your fleet</h2>
          <p className="my-2 text-sm leading-relaxed">
            {pagination.total} vehicles · Changes appear in the public catalog.
          </p>
        </div>
      </div>
      {loading ? (
        <p role="status" className="my-2 text-sm leading-relaxed">
          Loading fleet…
        </p>
      ) : loadError ? (
        <p className="my-3 text-sm leading-relaxed text-danger" role="alert">
          {loadError} <Button onClick={refresh}>Retry</Button>
        </p>
      ) : cars.length === 0 ? (
        <p className="my-2 text-sm leading-relaxed">
          No cars yet. Add your first vehicle using the form.
        </p>
      ) : (
        <div className="min-w-0">
          {cars.map((car) => (
            <article
              className="flex flex-col justify-between gap-4 border-b border-line py-5 md:flex-row"
              key={car.id}
            >
              <div className="min-w-0">
                <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-sage text-muted [&>svg]:w-4/5 [&>svg]:max-w-64 mb-4 w-44 max-w-full rounded-lg">
                  <CarPhoto path={car.image_path} name={car.name} />
                </div>
                <h3 className="mb-3 text-base font-semibold">{car.name}</h3>
                <p className="text-sm leading-relaxed text-muted">
                  {car.make} {car.model} · {car.category.toUpperCase()} ·{" "}
                  {car.plate_number}
                </p>
                <p className="my-2 text-sm leading-relaxed">
                  {money(car.daily_rate)} / day ·{" "}
                  <span
                    className={
                      car.maintenance
                        ? "my-3 text-sm leading-relaxed text-danger"
                        : "my-3 text-sm text-accent"
                    }
                  >
                    {car.maintenance ? "Maintenance" : "Available"}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Button
                  disabled={busy}
                  onClick={() => edit(car)}
                  aria-label={`Edit ${car.name}`}
                >
                  Edit
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    setRemoving(car);
                    setError("");
                    setNotice("");
                  }}
                  aria-label={`Delete ${car.name}`}
                  variant="secondary"
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination
        {...pagination}
        disabled={busy || loading}
        label="Fleet pagination"
      />
      {removing && (
        <section
          className="mt-6 space-y-3 rounded-xl bg-warm p-5 [&>button]:mr-2"
          aria-label="Confirm deletion"
        >
          <h3 className="mb-3 text-base font-semibold">
            Delete {removing.name}?
          </h3>
          <p className="my-2 text-sm leading-relaxed">
            This removes the car from the catalog. Cars with booking history are
            protected.
          </p>
          <Button disabled={busy} onClick={remove}>
            Confirm delete
          </Button>
          <Button
            disabled={busy}
            onClick={() => setRemoving(null)}
            variant="secondary"
          >
            Keep car
          </Button>
        </section>
      )}
    </Panel>
  );
}
