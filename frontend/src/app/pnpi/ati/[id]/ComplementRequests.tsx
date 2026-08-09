"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ATIComplementRequest } from "../../../../lib/api";

const DOC_OPTIONS = ["statuts", "bilan", "plan_site", "certification", "ancienne_ati", "note_extension"];

export function ComplementRequests({
  atiId,
  initialComplements,
  userRoles,
}: {
  atiId: string;
  initialComplements: ATIComplementRequest[];
  userRoles: string[];
}) {
  const router = useRouter();
  const canRequest = userRoles.some((role) => ["admin", "directeur", "instructeur"].includes(role));
  const canRespond = userRoles.some((role) =>
    ["admin", "directeur", "instructeur", "operateur"].includes(role),
  );
  const [motif, setMotif] = useState("");
  const [docs, setDocs] = useState<string[]>(["plan_site"]);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleDoc = (doc: string) => {
    setDocs((current) => (current.includes(doc) ? current.filter((d) => d !== doc) : [...current, doc]));
  };

  const createComplement = () => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/pnpi/ati/${encodeURIComponent(atiId)}/complements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif, requested_documents: docs }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de creer la demande de complement.");
        return;
      }
      setMotif("");
      router.refresh();
    });
  };

  const respond = (requestId: string) => {
    const response_note = responseNotes[requestId]?.trim();
    if (!response_note) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/pnpi/ati/${encodeURIComponent(atiId)}/complements/${encodeURIComponent(requestId)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response_note }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de repondre au complement.");
        return;
      }
      router.refresh();
    });
  };

  const close = (requestId: string) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/pnpi/ati/${encodeURIComponent(atiId)}/complements/${encodeURIComponent(requestId)}/close`,
        { method: "POST" },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de cloturer le complement.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "#003F8F", fontSize: "0.95rem" }}>Demandes de complements</h3>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
            Demande precise, reponse operateur et cloture par le service instructeur.
          </p>
        </div>
        <span style={{ color: "#6b7280", fontSize: "0.8rem", fontWeight: 700 }}>
          {initialComplements.filter((item) => item.status !== "clos").length} ouverte(s)
        </span>
      </div>

      {canRequest && (
        <div style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.85rem" }}>
          <textarea
            className="pnpi-form-textarea"
            rows={2}
            value={motif}
            onChange={(event) => setMotif(event.target.value)}
            placeholder="Ex : Veuillez fournir un plan de site lisible et une certification actualisee."
          />
          <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            {DOC_OPTIONS.map((doc) => (
              <button
                key={doc}
                type="button"
                onClick={() => toggleDoc(doc)}
                className={docs.includes(doc) ? "btn-primary" : "btn-secondary"}
              >
                {doc}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: "0.75rem" }}
            onClick={createComplement}
            disabled={isPending || !motif.trim()}
          >
            Envoyer la demande
          </button>
        </div>
      )}

      {error && <p style={{ color: "#b42318", fontSize: "0.8rem" }}>{error}</p>}

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        {initialComplements.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>
            Aucun complement demande pour ce dossier.
          </p>
        ) : (
          initialComplements.map((request) => (
            <div key={request.id} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <strong style={{ color: "#1f2937" }}>{request.motif}</strong>
                <span style={{ color: request.status === "clos" ? "#10b981" : "#f59e0b", fontSize: "0.78rem", fontWeight: 800 }}>
                  {request.status}
                </span>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                Pieces demandees : {request.requested_documents.join(", ") || "Non precisees"}
              </p>
              {request.response_note && (
                <p style={{ margin: "0.5rem 0 0", color: "#374151", fontSize: "0.84rem" }}>
                  Reponse : {request.response_note}
                </p>
              )}
              {request.status !== "clos" && canRespond && (
                <div style={{ marginTop: "0.65rem", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.5rem" }}>
                  <input
                    className="pnpi-form-input"
                    value={responseNotes[request.id] ?? ""}
                    onChange={(event) =>
                      setResponseNotes((current) => ({ ...current, [request.id]: event.target.value }))
                    }
                    placeholder="Note de reponse"
                  />
                  <button className="btn-secondary" type="button" disabled={isPending} onClick={() => respond(request.id)}>
                    Repondre
                  </button>
                  {canRequest && (
                    <button className="btn-primary" type="button" disabled={isPending} onClick={() => close(request.id)}>
                      Cloturer
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
