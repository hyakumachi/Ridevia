import Field from "../ui/Field";
import Input from "../ui/Input";
import { validatePhotos } from "../../lib/carPhoto";
import CarPhoto from "../cars/CarPhoto";
import Button from "../ui/Button";
export default function PhotoEditor({
  photoInput,
  setPhotos,
  setError,
  draft,
  setDraft,
  photos,
}) {
  return (
    <section className="mb-5 space-y-3">
      <Field>
        Car photos
        <Input
          ref={photoInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            setPhotos(files);
            setError(validatePhotos(files, draft.image_paths.length));
          }}
        />
      </Field>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Up to 8 JPEG, PNG or WebP photos · Maximum 5 MB each. The first photo is
        the rental card cover. New photos are added when saved.
      </p>
      <div className="grid grid-cols-2 gap-3 [&_button]:mt-2 [&_button]:w-full [&_button]:text-xs">
        {draft.image_paths.map((path, index) => (
          <div key={path}>
            <div className="relative flex w-full items-center justify-center overflow-hidden bg-sage text-muted [&>svg]:w-4/5 [&>svg]:max-w-64 mb-3 aspect-[4/3] rounded-lg">
              <CarPhoto path={path} name={`${draft.name} photo ${index + 1}`} />
            </div>
            <Button
              type="button"
              disabled={index === 0}
              onClick={() =>
                setDraft((value) => ({
                  ...value,
                  image_paths: [
                    path,
                    ...value.image_paths.filter((item) => item !== path),
                  ],
                }))
              }
            >
              {index === 0 ? "Cover photo" : "Use as cover"}
            </Button>
            <Button
              type="button"
              onClick={() =>
                setDraft((value) => ({
                  ...value,
                  image_paths: value.image_paths.filter(
                    (item) => item !== path,
                  ),
                }))
              }
              variant="secondary"
            >
              Remove photo {index + 1}
            </Button>
          </div>
        ))}
      </div>
      {photos.length > 0 && (
        <p className="text-sm leading-relaxed text-muted">
          Selected: {photos.map((photo) => photo.name).join(", ")}
        </p>
      )}
    </section>
  );
}
