import Button from "./Button";
export default function Pagination({
  page,
  pageSize,
  total,
  onPage,
  disabled = false,
  label = "Pagination",
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (!total) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, last])]
    .filter((value) => value >= 1 && value <= last)
    .sort((a, b) => a - b);
  return (
    <nav
      aria-label={label}
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
    >
      <p className="text-xs text-muted">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
        {total}
      </p>
      {last > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={disabled || page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Previous
          </Button>
          {pages.map((value, index) => (
            <span key={value} className="inline-flex items-center gap-2">
              {index > 0 && value - pages[index - 1] > 1 && (
                <span aria-hidden="true">…</span>
              )}
              <Button
                className="min-w-10 px-3"
                variant={value === page ? "primary" : "secondary"}
                aria-label={`Page ${value}`}
                aria-current={value === page ? "page" : undefined}
                disabled={disabled || value === page}
                onClick={() => onPage(value)}
              >
                {value}
              </Button>
            </span>
          ))}
          <Button
            variant="secondary"
            disabled={disabled || page >= last}
            onClick={() => onPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </nav>
  );
}
