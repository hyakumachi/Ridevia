import Button from "../ui/Button";
import Input from "../ui/Input";
import Field from "../ui/Field";
import Panel from "../ui/Panel";
import { manilaToday } from "../../lib/booking";
export default function DateSelection({
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
  setRefreshDates,
}) {
  return (
    <Panel>
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-accent">
          01
        </span>
        <h2 className="text-xl font-bold tracking-tight">
          Pick your dates
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          Pickup date
          <Input
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
        </Field>
        <Field>
          Return date
          <Input
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
        </Field>
      </div>
      <p className="mt-4 text-sm text-accent" aria-live="polite">
        {validDates
          ? `${days} rental day${days === 1 ? "" : "s"}${days >= 7 ? " · 10% discount included" : ""}`
          : start && end
            ? "Choose a return date after pickup, with no past dates."
            : "Choose both dates to check availability."}
      </p>
      {validDates && !checked && !availabilityError && (
        <p role="status" className="my-2 text-sm leading-relaxed">
          Checking availability…
        </p>
      )}
      {validDates && availabilityError && (
        <div role="alert" className="my-3 text-sm leading-relaxed text-danger">
          {availabilityError}{" "}
          <Button
            type="button"
            className="px-2 py-1 text-xs"
            onClick={() => {
              setAvailabilityError("");
              setRefreshDates((value) => value + 1);
            }}
          >
            Retry
          </Button>
        </div>
      )}
    </Panel>
  );
}
