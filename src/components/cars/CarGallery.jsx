import Button from "../ui/Button";
import { useState } from "react";
import CarPhoto from "./CarPhoto";
import { carPhotos } from "../../lib/carPhoto";
export default function CarGallery({ car }) {
  const paths = carPhotos(car);
  const [selected, setSelected] = useState(null);
  const current = paths.includes(selected) ? selected : paths[0];
  return (
    <section aria-label={`${car.name} photos`}>
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-sage text-muted [&>svg]:w-4/5 [&>svg]:max-w-64 mb-5 aspect-[4/3] rounded-lg">
        <CarPhoto path={current} name={car.name} />
      </div>
      {paths.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2 [&>button]:h-16 [&>button]:w-20 [&>button]:overflow-hidden [&>button]:p-0 [&>button[aria-pressed=true]]:ring-2 [&>button[aria-pressed=true]]:ring-accent">
          {paths.map((path, index) => (
            <Button
              key={path}
              type="button"
              aria-label={`View photo ${index + 1} of ${car.name}`}
              aria-pressed={path === current}
              onClick={() => setSelected(path)}
            >
              <CarPhoto
                path={path}
                name={`${car.name} thumbnail ${index + 1}`}
              />
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
