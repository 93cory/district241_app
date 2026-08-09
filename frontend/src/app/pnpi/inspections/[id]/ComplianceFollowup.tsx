"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  InspectionCorrectiveAction,
  InspectionFinding,
  InspectionSanction,
} from "../../../../lib/api";

const SEVERITY_LABELS: Record<string, string> = {
  mineure: "Mineure · 30 jours",
  majeure: "Majeure · 15 jours",
  critique: "Critique · immediat",
};

const COLORS: Record<string, string> = {
  mineure: "#d97706",
  majeure: "#e65100",
  critique: "#b42318",
};

export function ComplianceFollowup({
  inspectionId,
  findings,
  actions,
  sanctions,
  canEdit,
}: {
  inspectionId: string;
  findings: InspectionFinding[];
  actions: InspectionCorrectiveAction[];
  sanctions: InspectionSanction[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [findingForm, setFindingForm] = useState({
    category: "HSE",
    severity: "majeure",
    description: "",
    responsible: "",
  });
  const [actionText, setActionText] = useState<Record<string, string>>({});
  const [sanction, setSanction] = useState({ sanction_type: "avertissement", motive: "" });

  const createFinding = () => {
    if (!findingForm.description.trim()) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/pnpi/inspections/${encodeURIComponent(inspectionId)}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(findingForm),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de creer la non-conformite.");
        return;
      }
      setFindingForm((current) => ({ ...current, description: "" }));
      router.refresh();
    });
  };

  const createAction = (findingId: string) => {
    const action = actionText[findingId]?.trim();
    if (!action) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/pnpi/inspections/${encodeURIComponent(inspectionId)}/findings/${encodeURIComponent(findingId)}/corrective-actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de creer l'action corrective.");
        return;
      }
      router.refresh();
    });
  };

  const updateAction = (actionId: string, status: string) => {
    const current = actions.find((action) => action.id === actionId);
    if (!current) return;
    startTransition(async () => {
      await fetch(`/api/pnpi/inspections/${encodeURIComponent(inspectionId)}/corrective-actions/${encodeURIComponent(actionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: current.action, status }),
      });
      router.refresh();
    });
  };

  const createSanction = () => {
    if (!sanction.motive.trim()) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/pnpi/inspections/${encodeURIComponent(inspectionId)}/sanctions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanction),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Impossible de proposer la sanction.");
        return;
      }
      setSanction((current) => ({ ...current, motive: "" }));
      router.refresh();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "#003F8F", fontSize: "0.95rem" }}>
            Non-conformites & actions correctives
          </h3>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.84rem" }}>
            Suivi structure : gravite, delai, responsable, action corrective et sanction eventuelle.
          </p>
        </div>
        <span style={{ color: "#6b7280", fontWeight: 800 }}>{findings.length} constat(s)</span>
      </div>

      {canEdit && (
        <div style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.9rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <input
              className="pnpi-form-input"
              value={findingForm.category}
              onChange={(event) => setFindingForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Categorie"
            />
            <select
              className="pnpi-form-select"
              value={findingForm.severity}
              onChange={(event) => setFindingForm((current) => ({ ...current, severity: event.target.value }))}
            >
              {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <textarea
            className="pnpi-form-textarea"
            rows={2}
            style={{ marginTop: "0.6rem" }}
            value={findingForm.description}
            onChange={(event) => setFindingForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Description du constat / non-conformite"
          />
          <input
            className="pnpi-form-input"
            style={{ marginTop: "0.6rem" }}
            value={findingForm.responsible}
            onChange={(event) => setFindingForm((current) => ({ ...current, responsible: event.target.value }))}
            placeholder="Responsable cote entreprise"
          />
          <button className="btn-primary" type="button" style={{ marginTop: "0.7rem" }} onClick={createFinding} disabled={isPending}>
            Ajouter le constat
          </button>
        </div>
      )}

      {error && <p style={{ color: "#b42318", fontSize: "0.82rem" }}>{error}</p>}

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.8rem" }}>
        {findings.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>Aucune non-conformite structuree.</p>
        ) : (
          findings.map((finding) => {
            const linkedActions = actions.filter((action) => action.finding_id === finding.id);
            return (
              <div key={finding.id} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <strong style={{ color: "#1f2937" }}>{finding.category}</strong>
                  <span style={{ color: COLORS[finding.severity] ?? "#6b7280", fontWeight: 900 }}>
                    {finding.severity}
                  </span>
                </div>
                <p style={{ margin: "0.35rem 0 0", color: "#374151", fontSize: "0.88rem" }}>{finding.description}</p>
                <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                  Delai : {finding.due_at ? new Date(finding.due_at).toLocaleDateString("fr-FR") : "—"} · Responsable :{" "}
                  {finding.responsible || "—"} · Statut : {finding.status}
                </p>

                <div style={{ marginTop: "0.7rem", display: "grid", gap: "0.45rem" }}>
                  {linkedActions.map((action) => (
                    <div key={action.id} style={{ background: "#f9fafb", borderRadius: "8px", padding: "0.65rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                        <span>{action.action}</span>
                        <strong>{action.status}</strong>
                      </div>
                      {canEdit && action.status !== "validee" && (
                        <button className="btn-secondary" type="button" onClick={() => updateAction(action.id, "validee")} disabled={isPending}>
                          Valider
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {canEdit && (
                  <div style={{ marginTop: "0.65rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem" }}>
                    <input
                      className="pnpi-form-input"
                      value={actionText[finding.id] ?? ""}
                      onChange={(event) => setActionText((current) => ({ ...current, [finding.id]: event.target.value }))}
                      placeholder="Action corrective demandee"
                    />
                    <button className="btn-secondary" type="button" disabled={isPending} onClick={() => createAction(finding.id)}>
                      Ajouter action
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: "1.25rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
        <h4 style={{ margin: "0 0 0.75rem", color: "#92400e" }}>Sanctions / mesures administratives</h4>
        {sanctions.length === 0 ? (
          <p style={{ color: "#6b7280", margin: 0, fontSize: "0.85rem" }}>Aucune sanction proposee.</p>
        ) : (
          sanctions.map((item) => (
            <p key={item.id} style={{ margin: "0 0 0.4rem", color: "#374151" }}>
              <strong>{item.sanction_type}</strong> · {item.status} · {item.motive}
            </p>
          ))
        )}
        {canEdit && (
          <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "180px 1fr auto", gap: "0.5rem" }}>
            <select
              className="pnpi-form-select"
              value={sanction.sanction_type}
              onChange={(event) => setSanction((current) => ({ ...current, sanction_type: event.target.value }))}
            >
              <option value="avertissement">Avertissement</option>
              <option value="mise_en_demeure">Mise en demeure</option>
              <option value="suspension">Suspension</option>
              <option value="retrait">Retrait</option>
            </select>
            <input
              className="pnpi-form-input"
              value={sanction.motive}
              onChange={(event) => setSanction((current) => ({ ...current, motive: event.target.value }))}
              placeholder="Motif juridique / administratif"
            />
            <button className="btn-primary" type="button" onClick={createSanction} disabled={isPending}>
              Proposer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
