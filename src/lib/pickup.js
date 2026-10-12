export const pickupEventURL = "https://calendly.com/pacanza-berns4884/vehicle-pickup";
export function pickupLink({ group_ref, guestName, guestEmail, start }) {
  const url = new URL(pickupEventURL);
  url.search = new URLSearchParams({ name: guestName, email: guestEmail, date: start, utm_source: "ridevia", utm_medium: "booking", utm_content: group_ref }).toString();
  return url.href;
}
