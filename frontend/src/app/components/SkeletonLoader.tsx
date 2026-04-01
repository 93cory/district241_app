"use client";

interface SkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number;
  /** Variant: "table" for table rows, "card" for card placeholders, "text" for text lines */
  variant?: "table" | "card" | "text";
}

export function SkeletonLoader({ rows = 5, variant = "table" }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-card" aria-hidden="true">
            <div className="skeleton-line" style={{ height: "1.2rem", width: "60%", marginBottom: "0.75rem" }} />
            <div className="skeleton-line" style={{ height: "0.9rem", width: "80%" }} />
            <div className="skeleton-line" style={{ height: "0.9rem", width: "45%", marginTop: "0.5rem" }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div aria-hidden="true" role="status" aria-label="Chargement en cours">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-line"
            style={{ height: "0.9rem", width: `${70 + Math.random() * 30}%`, marginBottom: "0.6rem" }}
          />
        ))}
      </div>
    );
  }

  // Default: table variant
  return (
    <div aria-hidden="true" role="status" aria-label="Chargement en cours">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ display: "flex", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid var(--border-color, #eee)" }}>
          <div className="skeleton-line" style={{ height: "1rem", width: "15%", minWidth: "60px" }} />
          <div className="skeleton-line" style={{ height: "1rem", width: "35%", minWidth: "120px" }} />
          <div className="skeleton-line" style={{ height: "1rem", width: "20%", minWidth: "80px" }} />
          <div className="skeleton-line" style={{ height: "1rem", width: "12%", minWidth: "50px" }} />
        </div>
      ))}
    </div>
  );
}
