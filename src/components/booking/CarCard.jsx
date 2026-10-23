import Input from "../ui/Input";
import CarPhoto from "../cars/CarPhoto";
import { money } from "../../lib/format";
export default function CarCard({
  car,
  isSelected,
  blocked,
  checked,
  submitting,
  toggle,
}) {
  return (
    <article
      className={`flex h-full w-full min-w-0 max-w-[360px] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${isSelected ? "border-accent ring-2 ring-accent" : "border-line"}`}
    >
      <a
        href={`#cars/${car.id}`}
        aria-label={`View ${car.name}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-sage [&>svg]:h-full [&>svg]:w-4/5 [&>svg]:mx-auto"
      >
        <CarPhoto path={car.image_path} name={car.name} />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${blocked ? "bg-white text-danger" : "bg-white/95 text-ink"}`}
        >
          {car.status === "rented"
            ? "On rental"
            : car.status === "reserved"
              ? "Reserved"
              : blocked
                ? "Unavailable"
                : checked
                  ? "Available for dates"
                  : "Choose dates"}
        </span>
        {car.image_paths?.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/85 px-2.5 py-1 text-xs text-white">
            {car.image_paths.length} photos
          </span>
        )}
      </a>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
          {car.category}
        </p>
        <h3 className="mb-4 min-h-12 line-clamp-2 text-base font-bold leading-6">
          <a
            className="hover:text-accent focus-visible:underline"
            href={`#cars/${car.id}`}
          >
            {car.name}
          </a>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p>
            <strong className="text-lg font-bold">
              {money(car.daily_rate)}
            </strong>
            <span className="block text-xs text-muted">per day</span>
          </p>
          <label
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isSelected ? "bg-accent/10 text-accent" : "bg-sage text-ink"}`}
          >
            <Input
              type="checkbox"
              aria-label={`Select ${car.name}`}
              checked={isSelected}
              disabled={submitting || (blocked && !isSelected)}
              onChange={() => toggle(car)}
            />
            {isSelected ? "Selected" : "Select"}
          </label>
        </div>
      </div>
    </article>
  );
}
