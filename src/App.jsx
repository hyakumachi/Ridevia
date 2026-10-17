import { useEffect, useState } from "react";
import ContactPage from "./pages/ContactPage";
import GuestBooking from "./pages/GuestBooking";
import AdminPage from "./pages/AdminPage";
import CarDetailPage from "./pages/CarDetailPage";
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
      <AdminPage
        setupToken={params.get("token")}
        setupType={params.get("type")}
      />
    );
  if (route === "contact") return <ContactPage />;
  if (route.startsWith("cars/")) return <CarDetailPage id={route.slice(5)} />;
  return (
    <GuestBooking
      key={hash}
      initialCarId={route.startsWith("book/") ? route.slice(5) : null}
      initialStart={params.get("start") || ""}
      initialEnd={params.get("end") || ""}
    />
  );
}
