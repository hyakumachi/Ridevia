import { photoTypes, carPhotos, validatePhotos } from "../lib/carPhoto";
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
  image_paths: [],
};
export default function useCarManagement() {
  const [cars, setCars] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 8;
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
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    let active = true;
    supabase
      .from("cars")
      .select("*", { count: "exact" })
      .order("name")
      .order("id")
      .range((page - 1) * pageSize, page * pageSize - 1)
      .then(({ data, count, error: fetchError }) => {
        if (!active) return;
        const last = Math.max(1, Math.ceil((count || 0) / pageSize));
        if (!fetchError && page > last) {
          setPage(last);
          return;
        }
        setTotal(count || 0);
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
  }, [reload, page]);
  function refresh() {
    setLoading(true);
    setReload((value) => value + 1);
  }
  function reset() {
    setDraft(emptyCar);
    setEditing(null);
    setPhotos([]);
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
      image_paths: carPhotos(car),
    });
    setPhotos([]);
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
    const photoError = validatePhotos(photos, draft.image_paths.length);
    if (photoError) {
      setError(photoError);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const id = editing || crypto.randomUUID();
      const paths = [...draft.image_paths];
      for (const photo of photos) {
        const path = `${id}/${crypto.randomUUID()}.${photoTypes[photo.type]}`;
        const { error: uploadError } = await supabase.storage
          .from("car-photos")
          .upload(path, photo, {
            contentType: photo.type,
            upsert: false,
          });
        if (uploadError) {
          setError(
            "Photo upload failed. Check your connection and admin access, then try again. Car details were not saved.",
          );
          return;
        }
        paths.push(path);
      }
      payload.image_paths = paths;
      payload.image_path = paths[0] || null;
      // shortcut: unlinked photos are retained after uncertain saves/replacements; clean them in Storage for this class demo.
      const query = editing
        ? supabase.from("cars").update(payload).eq("id", editing)
        : supabase.from("cars").insert({
            ...payload,
            id,
          });
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
  const pagination = {
    page,
    pageSize,
    total,
    onPage: (value) => {
      setLoading(true);
      setRemoving(null);
      setPage(value);
    },
  };
  return {
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
    editorRef,
    editing,
    save,
    draft,
    setDraft,
    photoInput,
    setPhotos,
    photos,
    error,
    notice,
    reset,
  };
}
