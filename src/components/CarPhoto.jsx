import { useState } from "react";
import { supabase } from "../lib/supabase";
export default function CarPhoto({ path, name }) {
  const [failed, setFailed] = useState(null);
  if (path && failed !== path)
    return (
      <img
        className="car-photo"
        src={
          supabase.storage.from("car-photos").getPublicUrl(path).data.publicUrl
        }
        alt={name}
        loading="lazy"
        onError={() => setFailed(path)}
      />
    );
  return (
    <svg
      viewBox="0 0 240 100"
      aria-label={`Photo unavailable for ${name}`}
      role="img"
    >
      <path
        d="M30 65 45 43h39l22-23h52l28 25 27 7 9 25H25z"
        fill="currentColor"
      />
      <path d="m106 25-19 22h84l-19-22z" fill="#dff2ef" />
      <circle cx="65" cy="76" r="16" fill="#173b3d" />
      <circle cx="185" cy="76" r="16" fill="#173b3d" />
      <circle cx="65" cy="76" r="7" fill="#f2f5f2" />
      <circle cx="185" cy="76" r="7" fill="#f2f5f2" />
    </svg>
  );
}
