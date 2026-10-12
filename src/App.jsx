import { useEffect, useState } from "react";
import GuestBooking from "./GuestBooking";
import Admin from "./components/Admin";
import CarDetail from "./components/CarDetail";

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const navigate = () => setHash(window.location.hash);
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  const [route, query = ""] = hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  if (route === "admin" || route === "admin/setup")
    return (
      <Admin setupToken={params.get("token")} setupType={params.get("type")} />
    );
  if (route.startsWith("cars/")) return <CarDetail id={route.slice(5)} />;
  return (
    <GuestBooking
      key={hash}
      initialCarId={route.startsWith("book/") ? route.slice(5) : null}
      initialStart={params.get("start") || ""}
      initialEnd={params.get("end") || ""}
    />
  );
}
