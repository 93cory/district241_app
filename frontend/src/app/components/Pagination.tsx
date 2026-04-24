"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav
      className="pagination"
      aria-label="Pagination"
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-sm"
        aria-label="Page precedente"
      >
        &laquo;
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} style={{ padding: "0 0.25rem" }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`btn-sm ${p === page ? "btn-primary" : ""}`}
            aria-current={p === page ? "page" : undefined}
            style={{
              fontWeight: p === page ? "bold" : "normal",
              background: p === page ? "var(--primary-color, #1565c0)" : "transparent",
              color: p === page ? "#fff" : "inherit",
              border: "1px solid var(--border-color, #ddd)",
              borderRadius: "4px",
              padding: "0.25rem 0.5rem",
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-sm"
        aria-label="Page suivante"
      >
        &raquo;
      </button>

      <span
        style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary, #666)" }}
      >
        {total} resultat{total > 1 ? "s" : ""}
      </span>
    </nav>
  );
}
