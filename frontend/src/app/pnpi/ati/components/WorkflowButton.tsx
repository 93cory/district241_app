"use client";
import { useTransition, useState } from "react";
import { updateATIStatut } from "../actions";

const STATUT_TRANSITIONS: Record<string, string[]> = {
  soumis: ["en_instruction", "rejete"],
  en_instruction: ["en_validation", "rejete"],
  en_validation: ["approuve", "rejete"],
  approuve: ["expire"],
  rejete: [],
  expire: [],
};
const BTN_LABELS: Record<string, string> = {
  en_instruction: "Prendre en charge",
  en_validation: "Soumettre validation",
  approuve: "Approuver",
  expire: "Marquer expire",
  rejete: "Rejeter",
};
const BTN_COLORS: Record<string, string> = {
  en_instruction: "#3b82f6",
  en_validation: "#8b5cf6",
  approuve: "#10b981",
  expire: "#9ca3af",
  rejete: "#ef4444",
};

export function WorkflowButtons({ atiId, currentStatut }: { atiId: string; currentStatut: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nexts = STATUT_TRANSITIONS[currentStatut] ?? [];
  if (!nexts.length) return null;
  const handleTransition = (newStatut: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateATIStatut(atiId, { new_statut: newStatut, note: `Transition vers ${newStatut}` });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  };
  return (
    <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
      {nexts.map((next) => (
        <button
          key={next}
          onClick={() => handleTransition(next)}
          disabled={isPending}
          style={{ padding: "0.25rem 0.625rem", background: BTN_COLORS[next] ?? "#6b7280", color: "#fff", border: "none", borderRadius: "5px", fontSize: "0.73rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1, whiteSpace: "nowrap" }}
        >
          {isPending ? "..." : BTN_LABELS[next] ?? next}
        </button>
      ))}
      {error && <span style={{ color: "#ef4444", fontSize: "0.72rem" }}>{error}</span>}
    </div>
  );
}
