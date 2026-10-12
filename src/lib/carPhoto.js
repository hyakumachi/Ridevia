export const photoTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export function validatePhoto(file) {
  if (!file || !Object.hasOwn(photoTypes, file.type))
    return "Choose a JPEG, PNG or WebP photo.";
  if (file.size <= 0 || file.size > 5 * 1024 * 1024)
    return "Choose a non-empty photo no larger than 5 MB.";
  return "";
}
