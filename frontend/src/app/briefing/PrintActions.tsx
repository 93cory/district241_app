"use client";

export const PrintActions = () => {
  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          border: "none",
          borderRadius: "10px",
          padding: "0.65rem 0.95rem",
          background: "#0f2f64",
          color: "white",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Imprimer briefing
      </button>
      <a
        href="/api/exports/dashboard-pdf"
        style={{
          borderRadius: "10px",
          padding: "0.65rem 0.95rem",
          background: "#ffffff",
          color: "#0f2f64",
          textDecoration: "none",
          fontWeight: 600,
          border: "1px solid #d0d8e4",
        }}
      >
        Export PDF ministeriel
      </a>
    </div>
  );
};
