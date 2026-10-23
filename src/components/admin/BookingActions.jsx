import Button from "../ui/Button";
import { canIssueReceipt } from "../../lib/receipt";
export default function BookingActions({
  group,
  busy,
  setReceiptRef,
  everyStatus,
  change,
  setConfirming,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {canIssueReceipt(group.rows) && (
        <Button disabled={busy} onClick={() => setReceiptRef(group.ref)}>
          View receipt
        </Button>
      )}
      {everyStatus("ongoing") && (
        <Button
          disabled={busy}
          onClick={() =>
            change(group, {
              p_status: "completed",
            })
          }
        >
          Complete rental
        </Button>
      )}
      {group.rows.every((row) =>
        ["pending", "ongoing"].includes(row.status),
      ) && (
        <Button
          disabled={busy}
          onClick={() =>
            setConfirming({
              ref: group.ref,
              action: {
                p_status: "cancelled",
              },
              label: "Cancel reservation",
            })
          }
          variant="secondary"
        >
          Cancel reservation
        </Button>
      )}
    </div>
  );
}
