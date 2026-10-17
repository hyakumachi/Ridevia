import Pagination from "../ui/Pagination";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import BookingGroupCard from "./BookingGroupCard";
import RentalReceipt from "./RentalReceipt";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function BookingManagement() {
  const [groups, setGroups] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [receiptsOnly, setReceiptsOnly] = useState(false);
  const pageSize = 5;
  const [receiptRef, setReceiptRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [methods, setMethods] = useState({});
  const busyRef = useRef(false);
  useEffect(() => {
    let active = true;
    supabase
      .rpc("admin_booking_groups_page", {
        p_page: page,
        p_page_size: pageSize,
        p_receipts_only: receiptsOnly,
      })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        setGroups(data?.groups || []);
        setTotal(data?.total || 0);
        if (data?.page && data.page !== page) setPage(data.page);
        setLoadError(
          fetchError ? "Unable to load bookings. Please retry." : "",
        );
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoadError("Unable to load bookings. Please retry.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [reload, page, receiptsOnly]);
  function refresh() {
    setConfirming(null);
    setLoading(true);
    setReload((value) => value + 1);
  }
  async function change(group, action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data, error: updateError } = await supabase.rpc(
        "update_booking_group",
        {
          p_group_ref: group.ref,
          ...action,
        },
      );
      if (updateError || data !== group.rows.length) {
        setError(
          updateError?.code === "42501"
            ? "Your account cannot manage bookings. Check your admin access."
            : "The group change could not be confirmed. Reload bookings to check its current status before trying again.",
        );
        refresh();
        return;
      }
      setNotice("Booking group updated.");
      refresh();
    } catch {
      setError(
        "The change could not be confirmed. Reload bookings before trying again.",
      );
      refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  if (receiptRef)
    return (
      <RentalReceipt
        key={receiptRef}
        groupRef={receiptRef}
        onBack={() => {
          setReceiptRef(null);
          refresh();
        }}
      />
    );
  return (
    <section aria-label="Booking management">
      <div className="mb-6 flex flex-wrap items-start gap-3 [&_p]:text-sm [&_p]:text-muted">
        <div>
          <h2 className="mb-3 text-xl font-bold tracking-tight">
            {receiptsOnly ? "Receipts" : "Reservations"}
          </h2>
          <p className="my-2 text-sm leading-relaxed">
            {total} booking groups · Prices are fixed at reservation time.
          </p>
        </div>
        <Button
          disabled={busy || loading}
          onClick={refresh}
          variant="secondary"
        >
          Reload bookings
        </Button>
      </div>
      <nav aria-label="Booking views" className="mb-5 flex gap-3">
        <Button
          variant={receiptsOnly ? "secondary" : "primary"}
          disabled={busy || !receiptsOnly}
          aria-pressed={!receiptsOnly}
          onClick={() => {
            setLoading(true);
            setConfirming(null);
            setPage(1);
            setReceiptsOnly(false);
          }}
        >
          All bookings
        </Button>
        <Button
          variant={receiptsOnly ? "primary" : "secondary"}
          disabled={busy || receiptsOnly}
          aria-pressed={receiptsOnly}
          onClick={() => {
            setLoading(true);
            setConfirming(null);
            setPage(1);
            setReceiptsOnly(true);
          }}
        >
          Receipts
        </Button>
      </nav>
      {error && (
        <p role="alert" className="my-3 text-sm leading-relaxed text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="my-3 text-sm text-accent">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="my-2 text-sm leading-relaxed">
          Loading bookings…
        </p>
      ) : loadError ? (
        <p role="alert" className="my-3 text-sm leading-relaxed text-danger">
          {loadError} <Button onClick={refresh}>Retry</Button>
        </p>
      ) : groups.length === 0 ? (
        <Panel as="div">
          <p className="my-2 text-sm leading-relaxed">
            {receiptsOnly
              ? "No completed and paid receipts yet."
              : "No reservations yet. Guest bookings will appear here."}
          </p>
        </Panel>
      ) : (
        <div className="grid w-full max-w-4xl gap-6">
          {groups.map((group) => {
            return (
              <BookingGroupCard
                key={group.ref}
                group={group}
                busy={busy}
                setReceiptRef={setReceiptRef}
                change={change}
                setConfirming={setConfirming}
                methods={methods}
                setMethods={setMethods}
                confirming={confirming}
              />
            );
          })}
        </div>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        disabled={busy || loading}
        onPage={(value) => {
          setLoading(true);
          setConfirming(null);
          setPage(value);
        }}
        label={receiptsOnly ? "Receipts pagination" : "Bookings pagination"}
      />
    </section>
  );
}
