"use client";
import { useState, useTransition } from "react";
import { createInspection } from "../actions";
import type { OperateurBrief } from "../../../../lib/api";

const STATUTS = [
  { value: "conforme", label: "Conforme", color: "#10b981" },
  { value: "non_conforme", label: "Non conforme", color: "#ef4444" },
  { value: "partiel", label: "Partiel", color: "#f59e0b" },
];

export function InspectionCreateForm({ operateurs }: { operateurs: OperateurBrief[] }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    operateur_id: "",
    ati_id: "",
    date_inspection: new Date().toISOString().slice(0, 16),
    statut_conformite: "conforme",
    observations: "",
    mesures_correctives: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    startTransition(async () => {
      try {
        await createInspection({
          operateur_id: form.operateur_id,
          ati_id: form.ati_id || undefined,
          date_inspection: new Date(form.date_inspection).toISOString(),
          statut_conformite: form.statut_conformite,
          observations: form.observations,
          mesures_correctives: form.mesures_correctives || undefined,
        });
        setSuccess(true);
        setForm({ operateur_id: "", ati_id: "", date_inspection: new Date().toISOString().slice(0, 16), statut_conformite: "conforme", observations: "", mesures_correctives: "" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
  };

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>{label}</label>
      {node}
    </div>
  );

  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.45rem 0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" };

  return (
    <form onSubmit={handleSubmit}>
      {field("Operateur *", (
        <select required value={form.operateur_id} onChange={e => setForm(f => ({ ...f, operateur_id: e.target.value }))} style={inputStyle}>
          <option value="">-- Selectionner --</option>
          {operateurs.map(op => <option key={op.id} value={op.id}>{op.raison_sociale}</option>)}
        </select>
      ))}
      {field("Ref. ATI (optionnel)", (
        <input value={form.ati_id} onChange={e => setForm(f => ({ ...f, ati_id: e.target.value }))} placeholder="ATI-2026-XXXX" style={inputStyle} />
      ))}
      {field("Date d'inspection *", (
        <input type="datetime-local" required value={form.date_inspection} onChange={e => setForm(f => ({ ...f, date_inspection: e.target.value }))} style={inputStyle} />
      ))}
      {field("Statut de conformite *", (
        <select required value={form.statut_conformite} onChange={e => setForm(f => ({ ...f, statut_conformite: e.target.value }))} style={inputStyle}>
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      ))}
      {field("Observations *", (
        <textarea required value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows={4} placeholder="Constats de l'inspection..." style={{ ...inputStyle, resize: "vertical" }} />
      ))}
      {field("Mesures correctives", (
        <textarea value={form.mesures_correctives} onChange={e => setForm(f => ({ ...f, mesures_correctives: e.target.value }))} rows={3} placeholder="Actions requises (si non conforme)..." style={{ ...inputStyle, resize: "vertical" }} />
      ))}

      {success && <div style={{ padding: "0.6rem 1rem", background: "#f0fdf4", border: "1px solid #10b981", borderRadius: "6px", color: "#16a34a", fontSize: "0.875rem", marginBottom: "0.75rem" }}>Inspection enregistree avec succes.</div>}
      {error && <div style={{ padding: "0.6rem 1rem", background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "6px", color: "#b42318", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>}

      <button type="submit" disabled={isPending} style={{ width: "100%", padding: "0.6rem", background: isPending ? "#9ca3af" : "#003F8F", color: "white", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "0.9rem", cursor: isPending ? "not-allowed" : "pointer" }}>
        {isPending ? "Enregistrement..." : "Soumettre le rapport"}
      </button>
    </form>
  );
}
