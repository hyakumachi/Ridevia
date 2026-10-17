import Button from "../ui/Button";
import { useEffect, useRef, useState } from "react";
import { pickupLink } from "../../lib/pickup";
let widgetRequest;
function loadWidget() {
  if (window.Calendly) return Promise.resolve(window.Calendly);
  if (!widgetRequest)
    widgetRequest = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = () =>
        window.Calendly
          ? resolve(window.Calendly)
          : reject(new Error("Scheduler unavailable"));
      script.onerror = () => {
        script.remove();
        reject(new Error("Scheduler unavailable"));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      widgetRequest = null;
      throw error;
    });
  return widgetRequest;
}
export default function PickupScheduler({ reservation }) {
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const container = useRef(null);
  const url = pickupLink(reservation);
  useEffect(() => {
    if (!opened) return;
    let active = true;
    const element = container.current;
    loadWidget()
      .then((calendly) => {
        if (!active) return;
        calendly.initInlineWidget({
          url,
          parentElement: element,
          prefill: {
            name: reservation.guestName,
            email: reservation.guestEmail,
          },
          utm: {
            utmSource: "ridevia",
            utmMedium: "booking",
            utmContent: reservation.group_ref,
          },
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      element?.replaceChildren();
    };
  }, [opened, retry, url, reservation]);
  return (
    <section
      className="my-7 border-y border-line py-6"
      aria-label="Pickup scheduling"
    >
      <h3 className="mb-3 text-base font-semibold">
        Schedule your vehicle pickup
      </h3>
      <p className="my-2 text-sm leading-relaxed">
        Choose a pickup time on {reservation.start} in Philippine Time. This
        appointment covers all cars in your reservation.
      </p>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Your name, email and booking reference are passed to Calendly. Keep the
        Calendly confirmation with your rental reference. Scheduling does not
        record a payment or change your rental status.
      </p>
      {!opened && (
        <Button type="button" onClick={() => setOpened(true)}>
          Choose pickup time
        </Button>
      )}
      {opened && (
        <div
          ref={container}
          data-testid="pickup-widget"
          className="mt-5 h-[760px] min-w-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
        />
      )}
      {failed && (
        <p role="alert" className="my-3 text-sm leading-relaxed text-danger">
          The scheduler could not load. Use the link below, or{" "}
          <Button
            type="button"
            onClick={() => {
              setFailed(false);
              setRetry((value) => value + 1);
            }}
          >
            Retry scheduler
          </Button>
          .
        </p>
      )}
      <p className="my-2 text-sm leading-relaxed">
        <a
          className="underline underline-offset-4"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open pickup scheduling in a new tab
        </a>
      </p>
    </section>
  );
}
