"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { updateATIStatut } from "../actions";

const STATUT_TRANSITIONS: Record<string, { next: string; roles: string[] }[]> = {
  soumis: [
    { next: "en_instruction", roles: ["instructeur", "directeur", "admin"] },
    { next: "rejete", roles: ["directeur", "admin", "ministre"] },
  ],
  en_instruction: [
    { next: "en_validation", roles: ["instructeur", "directeur", "admin"] },
    { next: "rejete", roles: ["directeur", "admin", "ministre"] },
  ],
  en_validation: [
    { next: "approuve", roles: ["directeur", "admin", "ministre"] },
    { next: "rejete", roles: ["directeur", "admin", "ministre"] },
  ],
  approuve: [{ next: "expire", roles: ["admin", "directeur"] }],
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

interface WorkflowButtonsProps {
  atiId: string;
  currentStatut: string;
  currentEtape?: string;
  userRoles?: string[];
}

export function WorkflowButtons({
  atiId,
  currentStatut,
  currentEtape = "",
  userRoles = [],
}: WorkflowButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [motifRejet, setMotifRejet] = useState("");
  const router = useRouter();

  const transitions = STATUT_TRANSITIONS[currentStatut] ?? [];
  const available = transitions.filter((t) => t.roles.some((r) => userRoles.includes(r)));

  if (!available.length) return null;

  const handleConfirm = (newStatut: string) => {
    setError(null);

    if (newStatut === "rejete" && !motifRejet.trim()) {
      setError("Le motif de rejet est obligatoire.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: {
          new_statut: string;
          note?: string;
          motif_rejet?: string;
        } = {
          new_statut: newStatut,
          note: note.trim() || `Transition vers ${newStatut}`,
        };
        if (newStatut === "rejete") {
          payload.motif_rejet = motifRejet.trim();
        }
        await updateATIStatut(atiId, payload);
        setConfirmTarget(null);
        setNote("");
        setMotifRejet("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleCancel = () => {
    setConfirmTarget(null);
    setNote("");
    setMotifRejet("");
    setError(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.4rem 0.6rem",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.8rem",
    boxSizing: "border-box",
    marginTop: "0.375rem",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
        {available.map(({ next }) => (
          <button
            key={next}
            onClick={() => setConfirmTarget(next)}
            disabled={isPending || confirmTarget !== null}
            style={{
              padding: "0.25rem 0.625rem",
              background: BTN_COLORS[next] ?? "#6b7280",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              fontSize: "0.73rem",
              fontWeight: 600,
              cursor: isPending || confirmTarget !== null ? "not-allowed" : "pointer",
              opacity: isPending || confirmTarget !== null ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {BTN_LABELS[next] ?? next}
          </button>
        ))}
      </div>

      {/* Confirmation dialog */}
      {confirmTarget && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.875rem",
            background: "#f9fafb",
            borderRadius: "8px",
            border: `1px solid ${confirmTarget === "rejete" ? "#fca5a5" : "#d1d5db"}`,
          }}
        >
          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#1f2937",
              marginBottom: "0.375rem",
            }}
          >
            Confirmer : {BTN_LABELS[confirmTarget] ?? confirmTarget}
          </div>

          {confirmTarget === "rejete" && (
            <div style={{ marginBottom: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>
                Motif de rejet <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
                placeholder="Indiquez le motif de rejet..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          )}

          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Note (optionnelle)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: "0.375rem" }}>
            <button
              onClick={() => handleConfirm(confirmTarget)}
              disabled={isPending}
              style={{
                padding: "0.35rem 0.75rem",
                background: isPending ? "#9ca3af" : (BTN_COLORS[confirmTarget] ?? "#003F8F"),
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "..." : "Confirmer"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              style={{
                padding: "0.35rem 0.75rem",
                background: "#fff",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              Annuler
            </button>
          </div>

          {error && (
            <div style={{ marginTop: "0.375rem", color: "#ef4444", fontSize: "0.72rem" }}>
              {error}
            </div>
          )}
        </div>
      )}

      {!confirmTarget && error && (
        <span
          style={{ color: "#ef4444", fontSize: "0.72rem", marginTop: "0.25rem", display: "block" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
