import test from "node:test";
import assert from "node:assert/strict";
import { validatePhoto, validatePhotos, carPhotos } from "./carPhoto.js";
test("photo validation permits supported raster files up to 5 MB", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"])
    assert.equal(validatePhoto({ type, size: 5242880 }), "");
  for (const file of [
    null,
    { type: "image/svg+xml", size: 100 },
    { type: "text/html", size: 100 },
    { type: "image/png", size: 0 },
    { type: "image/png", size: 5242881 },
  ])
    assert(validatePhoto(file));
});

test("gallery preserves legacy cover and validates total count and each file", () => {
  assert.deepEqual(carPhotos({ image_path: "legacy.jpg" }), ["legacy.jpg"]);
  assert.deepEqual(
    carPhotos({
      image_path: "legacy.jpg",
      image_paths: ["cover.jpg", "side.jpg"],
    }),
    ["cover.jpg", "side.jpg"],
  );
  assert.deepEqual(carPhotos({ image_path: null, image_paths: [] }), []);
  const file = { type: "image/png", size: 1024 };
  assert.equal(validatePhotos([file, file], 6), "");
  assert(validatePhotos([file, file], 7));
  assert(validatePhotos([{ type: "image/svg+xml", size: 10 }]));
});
