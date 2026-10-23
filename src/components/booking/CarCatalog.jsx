import Button from "../ui/Button";
import Field from "../ui/Field";
import Select from "../ui/Select";
import Pagination from "../ui/Pagination";
import CarCard from "./CarCard";
export default function CarCatalog({
  loading,
  catalogError,
  setLoading,
  setReload,
  cars,
  checked,
  availability,
  selected,
  submitting,
  toggle,
  controls,
}) {
  return (
    <section className="pt-8" aria-label="Car catalog">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-accent">
          02
        </span>
        <h2 className="text-xl font-bold tracking-tight">Find your ride</h2>
      </div>
      <div className="mb-5 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
        <Field className="mb-0 block">
          Car type
          <Select
            value={controls.category}
            disabled={submitting}
            onChange={(event) => controls.onCategory(event.target.value)}
          >
            <option value="">All car types</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="van">Van</option>
          </Select>
        </Field>
        <Field className="mb-0 block">
          Sort by
          <Select
            value={controls.sort}
            disabled={submitting}
            onChange={(event) => controls.onSort(event.target.value)}
          >
            <option value="name">Name (A–Z)</option>
            <option value="type">Car type</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </Select>
        </Field>
      </div>
      {loading ? (
        <p role="status" className="py-8 text-sm text-muted">
          Loading cars…
        </p>
      ) : catalogError ? (
        <p role="alert" className="py-5 text-sm text-danger">
          {catalogError}{" "}
          <Button
            variant="secondary"
            onClick={() => {
              setLoading(true);
              setReload((value) => value + 1);
            }}
          >
            Retry
          </Button>
        </p>
      ) : cars.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
          No available cars match this type. Try another car type.
        </p>
      ) : (
        <div className="grid grid-cols-1 justify-items-center items-stretch gap-5 sm:grid-cols-2">
          {cars
            .filter((car) => !car.maintenance)
            .map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isSelected={selected.includes(car.id)}
                blocked={["reserved", "rented"].includes(car.status) || (checked && !availability.cars[car.id])}
                checked={checked}
                submitting={submitting}
                toggle={toggle}
              />
            ))}
        </div>
      )}
      <Pagination
        {...controls}
        disabled={loading || submitting}
        label="Cars pagination"
      />
    </section>
  );
}
