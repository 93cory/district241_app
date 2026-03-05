"use client";

import { CSSProperties, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ProjectDossier } from "../../lib/api";

interface Props {
  dossiers: ProjectDossier[];
}

const statusOptions = ["submitted", "under_review", "interministerial", "approved", "rejected"] as const;
const stageOptions = ["reception", "instruction", "validation", "decision"] as const;
const priorityOptions = ["low", "medium", "high"] as const;
const roleOptions = ["inspecteur", "ministre", "admin"] as const;

const statusLabel: Record<(typeof statusOptions)[number], string> = {
  submitted: "Soumis",
  under_review: "En instruction",
  interministerial: "Interministeriel",
  approved: "Approuve",
  rejected: "Rejete",
};

const stageLabel: Record<(typeof stageOptions)[number], string> = {
  reception: "Reception",
  instruction: "Instruction",
  validation: "Validation",
  decision: "Decision",
};

const priorityLabel: Record<(typeof priorityOptions)[number], string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

export const PilotageActions = ({ dossiers }: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const createDossier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      company_name: String(data.get("company_name") ?? "").trim(),
      project_title: String(data.get("project_title") ?? "").trim(),
      sector: String(data.get("sector") ?? "").trim(),
      location: String(data.get("location") ?? "").trim(),
      priority: String(data.get("priority") ?? "medium"),
      sla_days: Number(data.get("sla_days") ?? 30),
      assigned_to: String(data.get("assigned_to") ?? "").trim() || null,
      assigned_role: String(data.get("assigned_role") ?? "inspecteur"),
    };

    const response = await fetch("/api/pilotage/dossiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);

    if (!response.ok) {
      setMessage(`Creation dossier echouee (${response.status}).`);
      return;
    }
    form.reset();
    setMessage("Dossier cree avec succes.");
    router.refresh();
  };

  const updateDossier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const dossierId = String(data.get("dossier_id") ?? "");
    const payload = {
      dossier_id: dossierId,
      status: String(data.get(`status-${dossierId}`) ?? ""),
      stage: String(data.get(`stage-${dossierId}`) ?? ""),
      priority: String(data.get(`priority-${dossierId}`) ?? ""),
      sla_days: Number(data.get(`sla-${dossierId}`) ?? 30),
      assigned_to: String(data.get(`assigned-${dossierId}`) ?? "").trim(),
      assigned_role: String(data.get(`assigned-role-${dossierId}`) ?? "inspecteur"),
      decision_reason: String(data.get(`decision-reason-${dossierId}`) ?? "").trim(),
      decision_reference: String(data.get(`decision-ref-${dossierId}`) ?? "").trim(),
    };

    const response = await fetch("/api/pilotage/dossiers/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);

    if (!response.ok) {
      const body = await response.text();
      setMessage(`Mise a jour dossier echouee (${response.status}): ${body}`);
      return;
    }
    setMessage(`Dossier ${dossierId} mis a jour.`);
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
      <form className="table-card" style={{ flex: "1 1 420px" }} onSubmit={createDossier}>
        <h3 style={{ marginTop: 0 }}>Nouveau dossier industriel</h3>
        <input required name="company_name" placeholder="Entreprise" style={fieldStyle} />
        <input required name="project_title" placeholder="Intitule du projet" style={fieldStyle} />
        <input required name="sector" placeholder="Secteur" style={fieldStyle} />
        <input required name="location" placeholder="Province / localisation" style={fieldStyle} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select name="priority" defaultValue="medium" style={{ ...fieldStyle, marginBottom: 0 }}>
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            required
            name="sla_days"
            type="number"
            min={1}
            defaultValue={30}
            style={{ ...fieldStyle, marginBottom: 0 }}
          />
        </div>
        <input name="assigned_to" placeholder="Service assigne (optionnel)" style={fieldStyle} />
        <select name="assigned_role" defaultValue="inspecteur" style={fieldStyle}>
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              Role: {option}
            </option>
          ))}
        </select>
        <button disabled={busy} className="action-btn" type="submit">
          Creer dossier
        </button>
      </form>

      <div className="table-card" style={{ flex: "2 1 620px" }}>
        <h3 style={{ marginTop: 0 }}>Actions de flux</h3>
        {dossiers.slice(0, 8).map((dossier) => (
          <form
            key={dossier.id}
            onSubmit={updateDossier}
            style={{
              borderBottom: "1px solid #edf1f7",
              paddingBottom: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <input type="hidden" name="dossier_id" value={dossier.id} />
            <p style={{ margin: "0 0 0.45rem", fontWeight: 700 }}>{dossier.id} - {dossier.company_name}</p>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              <select name={`status-${dossier.id}`} defaultValue={dossier.status} style={compactFieldStyle}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabel[option]}
                  </option>
                ))}
              </select>
              <select name={`stage-${dossier.id}`} defaultValue={dossier.stage} style={compactFieldStyle}>
                {stageOptions.map((option) => (
                  <option key={option} value={option}>
                    {stageLabel[option]}
                  </option>
                ))}
              </select>
              <select name={`priority-${dossier.id}`} defaultValue={dossier.priority} style={compactFieldStyle}>
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {priorityLabel[option]}
                  </option>
                ))}
              </select>
              <input
                name={`sla-${dossier.id}`}
                type="number"
                min={1}
                defaultValue={dossier.sla_days}
                style={{ ...compactFieldStyle, maxWidth: 85 }}
              />
              <input
                name={`assigned-${dossier.id}`}
                defaultValue={dossier.assigned_to ?? ""}
                placeholder="Assignation"
                style={{ ...compactFieldStyle, minWidth: 170 }}
              />
              <select
                name={`assigned-role-${dossier.id}`}
                defaultValue={dossier.assigned_role ?? "inspecteur"}
                style={{ ...compactFieldStyle, minWidth: 130 }}
              >
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    Role: {option}
                  </option>
                ))}
              </select>
              <input
                name={`decision-reason-${dossier.id}`}
                defaultValue={dossier.decision_reason ?? ""}
                placeholder="Motif decision"
                style={{ ...compactFieldStyle, minWidth: 220 }}
              />
              <input
                name={`decision-ref-${dossier.id}`}
                defaultValue={dossier.decision_reference ?? ""}
                placeholder="Reference"
                style={{ ...compactFieldStyle, minWidth: 130 }}
              />
              <button disabled={busy} className="action-btn" type="submit">
                Mettre a jour
              </button>
            </div>
          </form>
        ))}
      </div>

      {message ? (
        <div className="chart-card" style={{ width: "100%" }}>
          {message}
        </div>
      ) : null}

      <style jsx>{`
        .action-btn {
          border: none;
          border-radius: 10px;
          padding: 0.55rem 0.8rem;
          background: #0f2f64;
          color: white;
          cursor: pointer;
          font-weight: 600;
        }
        .action-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
      `}</style>
    </div>
  );
};

const fieldStyle: CSSProperties = {
  width: "100%",
  marginBottom: "0.65rem",
  padding: "0.65rem",
  borderRadius: "10px",
  border: "1px solid #d8dee7",
  fontSize: "0.95rem",
};

const compactFieldStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #d8dee7",
  padding: "0.5rem 0.55rem",
  fontSize: "0.88rem",
};
