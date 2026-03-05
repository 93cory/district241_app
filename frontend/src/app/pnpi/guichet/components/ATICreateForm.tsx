"use client";
import { useState, useTransition } from "react";
import { createATI } from "../actions";
import type { OperateurBrief } from "../../../../lib/api";

const SECTEURS = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const SECTEUR_LABELS: Record<string, string> = { bois: "Bois & Foret", mines: "Mines", agroalimentaire: "Agro-alimentaire", btp: "BTP", petrole: "Petrole", services: "Services" };

const inputStyle = { width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box" as const };
const labelStyle = { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" };

export function ATICreateForm({ operateurs }: { operateurs: OperateurBrief[] }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      operateur_id: fd.get("operateur_id") as string,
      type_activite: fd.get("type_activite") as string,
      secteur: fd.get("secteur") as string,
      priorite: fd.get("priorite") as string,
      observations: fd.get("observations") as string || undefined,
    };
    if (!data.operateur_id || !data.type_activite || !data.secteur) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await createATI(data) as { numero_ati: string };
        setSuccess(`ATI ${result.numero_ati} soumis avec succes !`);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la soumission");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label style={labelStyle}>Operateur industriel *</label>
        <select name="operateur_id" required style={inputStyle}>
          <option value="">Selectionner un operateur...</option>
          {operateurs.map((op) => (
            <option key={op.id} value={op.id}>{op.raison_sociale} — {op.province.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Type d&apos;activite *</label>
        <input name="type_activite" type="text" required placeholder="Ex: Transformation du bois en planches sciees" style={inputStyle} />
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>Secteur *</label>
          <select name="secteur" required style={inputStyle}>
            <option value="">Selectionner...</option>
            {SECTEURS.map((s) => <option key={s} value={s}>{SECTEUR_LABELS[s]}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>Priorite</label>
          <select name="priorite" style={inputStyle} defaultValue="normale">
            <option value="normale">Normale</option>
            <option value="elevee">Elevee</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Observations / Justification</label>
        <textarea name="observations" rows={3} placeholder="Informations complementaires sur la demande..." style={{ ...inputStyle, resize: "vertical" }} />
      </div>
      {error && <div style={{ padding: "0.625rem 0.875rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "0.875rem" }}>{error}</div>}
      {success && <div style={{ padding: "0.625rem 0.875rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#16a34a", fontWeight: 600, fontSize: "0.875rem" }}>{success}</div>}
      <button
        type="submit"
        disabled={isPending}
        style={{ padding: "0.625rem 1.5rem", background: isPending ? "#9ca3af" : "#003F8F", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", alignSelf: "flex-start" }}
      >
        {isPending ? "Soumission en cours..." : "Soumettre la demande ATI"}
      </button>
    </form>
  );
}
