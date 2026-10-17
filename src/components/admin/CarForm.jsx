import PhotoEditor from "./PhotoEditor";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Field from "../ui/Field";
import Panel from "../ui/Panel";
export default function CarForm({
  editorRef,
  editing,
  save,
  busy,
  draft,
  setDraft,
  photoInput,
  setPhotos,
  setError,
  photos,
  error,
  notice,
  reset,
  refresh,
}) {
  return (
    <Panel className="xl:sticky xl:top-6">
      <h2
        ref={editorRef}
        tabIndex={-1}
        className="mb-3 text-xl font-bold tracking-tight"
      >
        {editing ? "Edit car" : "Add a car"}
      </h2>
      <form onSubmit={save} aria-label="Car editor">
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          {[
            ["name", "Display name", 120],
            ["make", "Make", 80],
            ["model", "Model", 80],
            ["plate_number", "Plate number", 30],
          ].map(([key, label, max]) => (
            <Field key={key}>
              {label}
              <Input
                required
                maxLength={max}
                value={draft[key]}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    [key]: event.target.value,
                  }))
                }
              />
            </Field>
          ))}
          <Field>
            Category
            <Select
              value={draft.category}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  category: event.target.value,
                }))
              }
            >
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="van">Van</option>
            </Select>
          </Field>
          <Field>
            Daily rate (PHP)
            <Input
              type="number"
              min="0.01"
              max="9999999999.99"
              step="0.01"
              required
              value={draft.daily_rate}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  daily_rate: event.target.value,
                }))
              }
            />
          </Field>
          <PhotoEditor
            photoInput={photoInput}
            setPhotos={setPhotos}
            setError={setError}
            draft={draft}
            setDraft={setDraft}
            photos={photos}
          />
          <Field className="mb-4 flex items-center gap-3">
            <Input
              type="checkbox"
              checked={draft.maintenance}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  maintenance: event.target.checked,
                }))
              }
            />
            Under maintenance
          </Field>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Resolve pending and ongoing bookings before placing a car under
            maintenance.
          </p>
        </fieldset>
        {error && (
          <p className="my-3 text-sm leading-relaxed text-danger" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="my-3 text-sm text-accent">
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : editing ? "Save changes" : "Add car"}
          </Button>
          {editing && (
            <Button
              disabled={busy}
              type="button"
              onClick={() => {
                reset();
                setError("");
              }}
              variant="secondary"
            >
              Cancel edit
            </Button>
          )}
          <Button
            type="button"
            disabled={busy}
            onClick={refresh}
            variant="secondary"
          >
            Reload fleet
          </Button>
        </div>
      </form>
    </Panel>
  );
}
