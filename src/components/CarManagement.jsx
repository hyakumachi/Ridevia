import CarPhoto from "./CarPhoto";
import { photoTypes, validatePhoto } from "../lib/carPhoto";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
const emptyCar = {
  name: "",
  make: "",
  model: "",
  category: "sedan",
  plate_number: "",
  daily_rate: "",
  maintenance: false,
  image_path: null,
};
const money = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value),
  );

export default function CarManagement() {
  const [cars, setCars] = useState([]);
  const [draft, setDraft] = useState(emptyCar);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const editorRef = useRef(null);
  const photoInput = useRef(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("cars")
      .select("*")
      .order("name")
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        setCars(data || []);
        setLoading(false);
        setLoadError(
          fetchError ? "Unable to load the fleet. Please retry." : "",
        );
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setLoadError("Unable to load the fleet. Please retry.");
        }
      });
    return () => {
      active = false;
    };
  }, [reload]);

  function refresh() {
    setLoading(true);
    setReload((value) => value + 1);
  }
  function reset() {
    setDraft(emptyCar);
    setEditing(null);
    setPhoto(null);
    if (photoInput.current) photoInput.current.value = "";
  }
  function edit(car) {
    setDraft({
      name: car.name,
      make: car.make,
      model: car.model,
      category: car.category,
      plate_number: car.plate_number,
      daily_rate: String(car.daily_rate),
      maintenance: car.maintenance,
      image_path: car.image_path,
    });
    setPhoto(null);
    if (photoInput.current) photoInput.current.value = "";
    setEditing(car.id);
    setError("");
    setNotice("");
    setRemoving(null);
    editorRef.current?.focus();
  }
  function explain(err) {
    if (err.code === "23505")
      return "That plate number is already in the fleet.";
    if (err.code === "23503")
      return "This car has booking history and cannot be deleted. Keep its record and use maintenance when appropriate.";
    if (err.code === "23514")
      return "Check the car details. A car with pending or ongoing bookings cannot be placed under maintenance.";
    if (err.code === "42501" || err.code === "PGRST116")
      return "Your account cannot change this record. Check your admin access.";
    return "The change could not be confirmed. Reload the fleet before trying again.";
  }
  async function save(event) {
    event.preventDefault();
    if (busyRef.current) return;
    const payload = {
      ...draft,
      name: draft.name.trim(),
      make: draft.make.trim(),
      model: draft.model.trim(),
      plate_number: draft.plate_number.trim().toUpperCase(),
      daily_rate: Number(draft.daily_rate),
    };
    if (
      !payload.name ||
      !payload.make ||
      !payload.model ||
      !payload.plate_number ||
      !Number.isFinite(payload.daily_rate) ||
      payload.daily_rate <= 0
    ) {
      setError("Complete the car details and enter a positive daily rate.");
      return;
    }
    if (photo && validatePhoto(photo)) {
      setError(validatePhoto(photo));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const id = editing || crypto.randomUUID();
      if (photo) {
        const path = `${id}/${crypto.randomUUID()}.${photoTypes[photo.type]}`;
        const { error: uploadError } = await supabase.storage
          .from("car-photos")
          .upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadError) {
          setError(
            "Photo upload failed. Check your connection and admin access, then try again. Car details were not saved.",
          );
          return;
        }
        payload.image_path = path;
      }
      // shortcut: unlinked photos are retained after uncertain saves/replacements; clean them in Storage for this class demo.
      const query = editing
        ? supabase.from("cars").update(payload).eq("id", editing)
        : supabase.from("cars").insert({ ...payload, id });
      const { error: saveError } = await query.select("id").single();
      if (saveError) {
        setError(explain(saveError));
        return;
      }
      setNotice(editing ? "Car updated." : "Car added.");
      reset();
      refresh();
    } catch {
      setError(
        "The change could not be confirmed. Reload the fleet before trying again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data, error: deleteError } = await supabase
        .from("cars")
        .delete()
        .eq("id", removing.id)
        .select("id");
      if (deleteError) {
        setError(explain(deleteError));
        return;
      }
      if (data.length !== 1) {
        setError(
          "This record could not be deleted. Reload the fleet and check your access.",
        );
        return;
      }
      if (editing === removing.id) reset();
      setRemoving(null);
      setNotice("Car deleted.");
      refresh();
    } catch {
      setError(
        "The deletion could not be confirmed. Reload the fleet before trying again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="admin-grid">
      <section className="panel fleet-panel">
        <div className="section-heading">
          <div>
            <h2>Your fleet</h2>
            <p>
              {cars.length} vehicles · Changes appear in the public catalog.
            </p>
          </div>
        </div>
        {loading ? (
          <p role="status">Loading fleet…</p>
        ) : loadError ? (
          <p className="error" role="alert">
            {loadError} <button onClick={refresh}>Retry</button>
          </p>
        ) : cars.length === 0 ? (
          <p>No cars yet. Add your first vehicle using the form.</p>
        ) : (
          <div className="fleet-list">
            {cars.map((car) => (
              <article className="fleet-row" key={car.id}>
                <div>
                  <div className="car-art fleet-photo">
                    <CarPhoto path={car.image_path} name={car.name} />
                  </div>
                  <h3>{car.name}</h3>
                  <p className="muted">
                    {car.make} {car.model} · {car.category.toUpperCase()} ·{" "}
                    {car.plate_number}
                  </p>
                  <p>
                    {money(car.daily_rate)} / day ·{" "}
                    <span
                      className={car.maintenance ? "error" : "available-text"}
                    >
                      {car.maintenance ? "Maintenance" : "Available"}
                    </span>
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    disabled={busy}
                    onClick={() => edit(car)}
                    aria-label={`Edit ${car.name}`}
                  >
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => {
                      setRemoving(car);
                      setError("");
                      setNotice("");
                    }}
                    aria-label={`Delete ${car.name}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {removing && (
          <section
            className="delete-confirmation"
            aria-label="Confirm deletion"
          >
            <h3>Delete {removing.name}?</h3>
            <p>
              This removes the car from the catalog. Cars with booking history
              are protected.
            </p>
            <button disabled={busy} onClick={remove}>
              Confirm delete
            </button>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Keep car
            </button>
          </section>
        )}
      </section>
      <section className="panel car-editor">
        <h2 ref={editorRef} tabIndex={-1}>
          {editing ? "Edit car" : "Add a car"}
        </h2>
        <form onSubmit={save}>
          <fieldset disabled={busy}>
            {[
              ["name", "Display name", 120],
              ["make", "Make", 80],
              ["model", "Model", 80],
              ["plate_number", "Plate number", 30],
            ].map(([key, label, max]) => (
              <label key={key}>
                {label}
                <input
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
              </label>
            ))}
            <label>
              Category
              <select
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
              </select>
            </label>
            <label>
              Daily rate (PHP)
              <input
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
            </label>
            <label>
              Car photo
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setPhoto(file);
                  setError(file ? validatePhoto(file) : "");
                }}
              />
            </label>
            <p className="fine-print">
              JPEG, PNG or WebP · Maximum 5 MB. Optional; choosing a new photo
              replaces the displayed photo when saved.
            </p>
            {draft.image_path && (
              <div className="car-art editor-photo">
                <CarPhoto path={draft.image_path} name={draft.name} />
              </div>
            )}
            {photo && <p className="muted">Selected: {photo.name}</p>}
            <label className="checkbox-label">
              <input
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
            </label>
            <p className="fine-print">
              Resolve pending and ongoing bookings before placing a car under
              maintenance.
            </p>
          </fieldset>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="available-text">
              {notice}
            </p>
          )}
          <div className="row-actions">
            <button disabled={busy} type="submit">
              {busy ? "Saving…" : editing ? "Save changes" : "Add car"}
            </button>
            {editing && (
              <button
                className="secondary-button"
                disabled={busy}
                type="button"
                onClick={() => {
                  reset();
                  setError("");
                }}
              >
                Cancel edit
              </button>
            )}
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={refresh}
            >
              Reload fleet
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
