"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { OperateurBrief } from "../../../../lib/api";

const currentMonth = new Date().toISOString().slice(0, 7);

export default function ONIDeclarationForm({ operateurs }: { operateurs: OperateurBrief[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const numberValue = (name: string) => Number(form.get(name) || 0);
    const payload = {
      operateur_id: String(form.get("operateur_id") || ""),
      period: String(form.get("period") || currentMonth),
      production_volume: numberValue("production_volume"),
      capacity_installed: numberValue("capacity_installed"),
      capacity_used: numberValue("capacity_used"),
      jobs_total: numberValue("jobs_total"),
      jobs_created: numberValue("jobs_created"),
      jobs_lost: numberValue("jobs_lost"),
      investment_fcfa: numberValue("investment_fcfa"),
      exports_value_fcfa: numberValue("exports_value_fcfa"),
      imports_value_fcfa: numberValue("imports_value_fcfa"),
      local_raw_material_pct: numberValue("local_raw_material_pct"),
      imported_raw_material_pct: numberValue("imported_raw_material_pct"),
      energy_kwh: numberValue("energy_kwh"),
      stock_raw_material: numberValue("stock_raw_material"),
      stock_finished_goods: numberValue("stock_finished_goods"),
    };
    try {
      const response = await fetch("/api/pnpi/oni/declarations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Erreur API ${response.status}`);
      }
      setSuccess("Declaration ONI enregistree. Les controles automatiques ont ete executes.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer la declaration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="chart-card" style={{ padding: "1rem", display: "grid", gap: "0.85rem" }}>
      <h2 style={{ margin: 0, color: "#003F8F", fontSize: "1.05rem" }}>Nouvelle declaration periodique</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.75rem" }}>
        <label>
          <span>Entreprise</span>
          <select name="operateur_id" required defaultValue={operateurs[0]?.id ?? ""}>
            {operateurs.map((op) => (
              <option key={op.id} value={op.id}>{op.raison_sociale}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Periode</span>
          <input name="period" type="month" defaultValue={currentMonth} required />
        </label>
        <NumberField name="production_volume" label="Production" defaultValue={1250} />
        <NumberField name="capacity_installed" label="Capacite installee" defaultValue={2000} />
        <NumberField name="capacity_used" label="Capacite utilisee" defaultValue={1300} />
        <NumberField name="jobs_total" label="Emplois totaux" defaultValue={85} />
        <NumberField name="jobs_created" label="Emplois crees" defaultValue={6} />
        <NumberField name="jobs_lost" label="Emplois perdus" defaultValue={1} />
        <NumberField name="investment_fcfa" label="Investissements FCFA" defaultValue={25000000} />
        <NumberField name="exports_value_fcfa" label="Exportations FCFA" defaultValue={12000000} />
        <NumberField name="imports_value_fcfa" label="Importations FCFA" defaultValue={5000000} />
        <NumberField name="local_raw_material_pct" label="Intrants locaux %" defaultValue={62} />
        <NumberField name="imported_raw_material_pct" label="Intrants importes %" defaultValue={38} />
        <NumberField name="energy_kwh" label="Energie kWh" defaultValue={145000} />
        <NumberField name="stock_raw_material" label="Stock matieres" defaultValue={320} />
        <NumberField name="stock_finished_goods" label="Stock produits finis" defaultValue={180} />
      </div>
      {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 800 }}>{error}</p>}
      {success && <p style={{ margin: 0, color: "#047857", fontWeight: 800 }}>{success}</p>}
      <button className="btn-primary" type="submit" disabled={isSubmitting || operateurs.length === 0}>
        {isSubmitting ? "Enregistrement..." : "Soumettre la declaration"}
      </button>
    </form>
  );
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} type="number" min="0" step="0.01" defaultValue={defaultValue} />
    </label>
  );
}
