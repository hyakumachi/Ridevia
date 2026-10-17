import Button from "../ui/Button";
import Input from "../ui/Input";
import Field from "../ui/Field";
import Panel from "../ui/Panel";
import { money } from "../../lib/format";
import { estimatePrice } from "../../lib/booking";
export default function GuestSummary({
  chosen,
  onRemove,
  days,
  submitting,
  guest,
  setGuest,
  unavailable,
  error,
  canSubmit,
}) {
  return (
    <Panel className="xl:sticky xl:top-6" as="aside">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-accent">
          03
        </span>
        <h2 className="text-xl font-bold tracking-tight">
          Make it yours
        </h2>
      </div>
      <div className="my-6 border-y border-line py-5 [&>span]:block [&>span]:text-sm [&>span]:text-muted [&>strong]:my-3 [&>strong]:block [&>strong]:text-3xl [&>small]:block [&>small]:text-xs [&>small]:text-muted">
        <span>
          {chosen.length} car{chosen.length === 1 ? "" : "s"} · {days} day
          {days === 1 ? "" : "s"}
        </span>
        <strong>{money(estimatePrice(chosen, days))}</strong>
        <small>
          Estimated rental total{days >= 7 ? " · 10% discount" : ""}. Final
          price confirmed on submission.
        </small>
      </div>
      <p className="my-2 text-sm leading-relaxed">
        <strong>Pay at pickup.</strong> No online payment is required to reserve
        your car.
      </p>
      {chosen.length > 0 && (
        <ul
          aria-label="Selected cars"
          className="my-5 max-h-48 overflow-y-auto space-y-2 border-y border-line py-3"
        >
          {chosen.map((car) => (
            <li
              key={car.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0">{car.name}</span>
              <Button
                disabled={submitting}
                variant="secondary"
                className="shrink-0 px-2 py-1 text-xs"
                aria-label={`Remove ${car.name} from reservation`}
                onClick={() => onRemove(car)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <fieldset disabled={submitting} className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">Guest details</legend>
        {[
          ["fullName", "Full name", "text", "name", 120],
          ["email", "Email address", "email", "email", 254],
          ["phone", "Phone number", "tel", "tel", 30],
          ["license", "Driver’s license number", "text", "off", 60],
        ].map(([key, title, type, autoComplete, maxLength]) => (
          <Field key={key}>
            {title}
            <Input
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
          </Field>
        ))}
      </fieldset>
      {unavailable && (
        <p className="my-3 text-sm leading-relaxed text-danger" role="alert">
          Remove unavailable cars or choose different dates.
        </p>
      )}
      {error && (
        <p className="my-3 text-sm leading-relaxed text-danger" role="alert">
          {error}
        </p>
      )}
      <Button className="mt-2 w-full" type="submit" disabled={!canSubmit}>
        {submitting ? "Submitting reservation…" : "Reserve your ride →"}
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Your reservation starts as pending. Payment is due at pickup, and no
        money is collected on this site. Your license details are accessible
        only to Ridevia’s authorized staff.
      </p>
    </Panel>
  );
}
