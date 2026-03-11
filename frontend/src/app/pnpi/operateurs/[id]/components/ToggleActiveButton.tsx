"use client";
import { useTransition, useState } from "react";
import { toggleOperateurActive } from "../../actions";

export function ToggleActiveButton({ operateurId, isActive }: { operateurId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        await toggleOperateurActive(operateurId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      <button
        onClick={handleToggle}
        disabled={isPending}
        style={{
          padding: "0.35rem 0.75rem",
          background: isActive ? "#fef2f2" : "#f0fdf4",
          color: isActive ? "#dc2626" : "#16a34a",
          border: `1px solid ${isActive ? "#fecaca" : "#bbf7d0"}`,
          borderRadius: "6px",
          fontSize: "0.78rem",
          fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? "..." : isActive ? "Desactiver" : "Activer"}
      </button>
      {error && <span style={{ color: "#ef4444", fontSize: "0.72rem" }}>{error}</span>}
    </div>
  );
}
