import FleetList from "./FleetList";
import CarForm from "./CarForm";
import useCarManagement from "../../hooks/useCarManagement";
export default function CarManagement(props) {
  const {
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
  } = useCarManagement(props);
  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <FleetList
        pagination={pagination}
        cars={cars}
        loading={loading}
        loadError={loadError}
        refresh={refresh}
        busy={busy}
        edit={edit}
        setRemoving={setRemoving}
        setError={setError}
        setNotice={setNotice}
        removing={removing}
        remove={remove}
      />
      <CarForm
        editorRef={editorRef}
        editing={editing}
        save={save}
        busy={busy}
        draft={draft}
        setDraft={setDraft}
        photoInput={photoInput}
        setPhotos={setPhotos}
        setError={setError}
        photos={photos}
        error={error}
        notice={notice}
        reset={reset}
        refresh={refresh}
      />
    </div>
  );
}
