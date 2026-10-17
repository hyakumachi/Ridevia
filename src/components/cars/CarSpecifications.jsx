import Panel from "../ui/Panel";
import CarGallery from "./CarGallery";
import { money } from "../../lib/format";
export default function CarSpecifications({ car }) {
  return (
    <Panel>
      <CarGallery key={car.id} car={car} />
      <h2 className="mb-3 text-xl font-bold tracking-tight">Vehicle details</h2>
      <dl className="my-6 [&>div]:border-b [&>div]:border-line [&>div]:py-3">
        <div>
          <dt className="text-xs text-muted">Make</dt>
          <dd className="mt-2 font-semibold">{car.make}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Model</dt>
          <dd className="mt-2 font-semibold">{car.model}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Category</dt>
          <dd className="mt-2 font-semibold">{car.category.toUpperCase()}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Daily rental rate</dt>
          <dd className="mt-2 font-semibold">{money(car.daily_rate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Fleet status</dt>
          <dd className="mt-2 font-semibold">
            {car.maintenance
              ? "Under maintenance"
              : "Available — check your dates below"}
          </dd>
        </div>
      </dl>
      <p className="text-sm leading-relaxed text-muted">
        Rent for seven days or more and receive 10% off. The return date is
        excluded.
      </p>
    </Panel>
  );
}
