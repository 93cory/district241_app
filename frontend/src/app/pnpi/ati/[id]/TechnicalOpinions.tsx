"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ATITechnicalOpinion } from "../../../../lib/api";

const STATUS_LABELS: Record<string, string> = {
  demande: "Demande",
  favorable: "Favorable",
  reserve: "Reserve",
  defavorable: "Defavorable",
};

const STATUS_COLORS: Record<string, string> = {
  demande: "#f59e0b",
  favorable: "#10b981",
  reserve: "#8b5cf6",
  defavorable: "#ef4444",
};

export function TechnicalOpinions({
  atiId,
  initialOpinions,
  userRoles,
}: {
  atiId: string;
  initialOpinions: ATITechnicalOpinion[];
  userRoles: string[];
}) {
  const router = useRouter();
  const canManage = userRoles.some((role) =>
    ["admin", "directeur", "instructeur", "inspecteur"].includes(role),
  );
  const [direction, setDirection] = useState("Direction de la Normalisation");
  const [motivation, setMotivation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const createOpinion = () => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/pnpi/ati/${encodeURIComponent(atiId)}/technical-opinions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, motivation: motivation || null }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de demander l'avis technique.");
        return;
      }
      setMotivation("");
      router.refresh();
    });
  };

  const updateOpinion = (opinionId: string, status: string) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/pnpi/ati/${encodeURIComponent(atiId)}/technical-opinions/${encodeURIComponent(opinionId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, motivation: `Avis ${STATUS_LABELS[status] ?? status}` }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de mettre a jour l'avis.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "#003F8F", fontSize: "0.95rem" }}>Avis techniques</h3>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
            Consultation formelle d'une direction ou d'un organisme partenaire.
          </p>
        </div>
        <span style={{ color: "#6b7280", fontSize: "0.8rem", fontWeight: 700 }}>
          {initialOpinions.length} avis
        </span>
      </div>

      {canManage && (
        <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1.5fr auto", gap: "0.6rem" }}>
          <input
            className="pnpi-form-input"
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
            placeholder="Direction concernee"
          />
          <input
            className="pnpi-form-input"
            value={motivation}
            onChange={(event) => setMotivation(event.target.value)}
            placeholder="Motif / point technique a verifier"
          />
          <button className="btn-primary" type="button" onClick={createOpinion} disabled={isPending || !direction.trim()}>
            Demander
          </button>
        </div>
      )}

      {error && <p style={{ color: "#b42318", fontSize: "0.8rem" }}>{error}</p>}

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        {initialOpinions.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>
            Aucun avis technique demande pour le moment.
          </p>
        ) : (
          initialOpinions.map((opinion) => (
            <div key={opinion.id} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <strong style={{ color: "#1f2937" }}>{opinion.direction}</strong>
                <span
                  style={{
                    color: STATUS_COLORS[opinion.status] ?? "#6b7280",
                    background: `${STATUS_COLORS[opinion.status] ?? "#6b7280"}18`,
                    borderRadius: "999px",
                    padding: "0.2rem 0.55rem",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                  }}
                >
                  {STATUS_LABELS[opinion.status] ?? opinion.status}
                </span>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                Demande par {opinion.requested_by}
                {opinion.signed_by ? ` · Signe par ${opinion.signed_by}` : ""}
              </p>
              {opinion.motivation && (
                <p style={{ margin: "0.5rem 0 0", color: "#374151", fontSize: "0.84rem" }}>
                  {opinion.motivation}
                </p>
              )}
              {canManage && opinion.status === "demande" && (
                <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  {["favorable", "reserve", "defavorable"].map((status) => (
                    <button
                      key={status}
                      className="btn-secondary"
                      type="button"
                      disabled={isPending}
                      onClick={() => updateOpinion(opinion.id, status)}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
