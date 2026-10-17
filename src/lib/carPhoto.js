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
export const maxCarPhotos = 8;
export function carPhotos(car) {
  return car.image_paths?.length
    ? car.image_paths
    : car.image_path
      ? [car.image_path]
      : [];
}
export function validatePhotos(files, existingCount = 0) {
  if (files.length + existingCount > maxCarPhotos)
    return `Keep up to ${maxCarPhotos} photos per car.`;
  return files.map(validatePhoto).find(Boolean) || "";
}
