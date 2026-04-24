"use client";
import { useState, useTransition } from "react";
import { createInspection } from "../actions";
import type { OperateurBrief } from "../../../../lib/api";
import { VoiceInput } from "../../../components/VoiceInput";

const STATUTS = [
  { value: "conforme", label: "Conforme" },
  { value: "non_conforme", label: "Non conforme" },
  { value: "partiel", label: "Partiel" },
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
        setForm({
          operateur_id: "",
          ati_id: "",
          date_inspection: new Date().toISOString().slice(0, 16),
          statut_conformite: "conforme",
          observations: "",
          mesures_correctives: "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="pnpi-form-stack">
      <div className="pnpi-form-field">
        <label htmlFor="insp-operateur" className="pnpi-form-label pnpi-form-label-req">Operateur</label>
        <select
          id="insp-operateur"
          className="pnpi-form-select"
          required
          value={form.operateur_id}
          onChange={(e) => setForm((f) => ({ ...f, operateur_id: e.target.value }))}
        >
          <option value="">Selectionner un operateur</option>
          {operateurs.map((op) => (
            <option key={op.id} value={op.id}>{op.raison_sociale}</option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="insp-ati" className="pnpi-form-label">Reference ATI</label>
        <input
          id="insp-ati"
          className="pnpi-form-input"
          value={form.ati_id}
          onChange={(e) => setForm((f) => ({ ...f, ati_id: e.target.value }))}
          placeholder="ATI-2026-XXXX (optionnel)"
        />
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="insp-date" className="pnpi-form-label pnpi-form-label-req">Date d&apos;inspection</label>
        <input
          id="insp-date"
          type="datetime-local"
          className="pnpi-form-input"
          required
          value={form.date_inspection}
          onChange={(e) => setForm((f) => ({ ...f, date_inspection: e.target.value }))}
        />
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="insp-statut" className="pnpi-form-label pnpi-form-label-req">Statut de conformite</label>
        <select
          id="insp-statut"
          className="pnpi-form-select"
          required
          value={form.statut_conformite}
          onChange={(e) => setForm((f) => ({ ...f, statut_conformite: e.target.value }))}
        >
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <div className="pnpi-form-label-row">
          <label htmlFor="insp-observations" className="pnpi-form-label pnpi-form-label-req">Observations</label>
          <VoiceInput
            value={form.observations}
            onChange={(v) => setForm((f) => ({ ...f, observations: v }))}
            ariaLabel="Dicter les observations"
          />
        </div>
        <textarea
          id="insp-observations"
          className="pnpi-form-textarea"
          required
          value={form.observations}
          onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
          rows={4}
          placeholder="Constats detailles de l'inspection... (utilisez le microphone pour dicter)"
        />
      </div>

      <div className="pnpi-form-field">
        <div className="pnpi-form-label-row">
          <label htmlFor="insp-mesures" className="pnpi-form-label">Mesures correctives</label>
          <VoiceInput
            value={form.mesures_correctives}
            onChange={(v) => setForm((f) => ({ ...f, mesures_correctives: v }))}
            ariaLabel="Dicter les mesures correctives"
          />
        </div>
        <textarea
          id="insp-mesures"
          className="pnpi-form-textarea"
          value={form.mesures_correctives}
          onChange={(e) => setForm((f) => ({ ...f, mesures_correctives: e.target.value }))}
          rows={3}
          placeholder="Actions requises (si non conforme ou partiel)"
        />
      </div>

      {success && (
        <div className="pnpi-form-alert pnpi-form-alert--success" role="status">
          Inspection enregistree avec succes.
        </div>
      )}
      {error && (
        <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-primary pnpi-form-submit">
        {isPending ? "Enregistrement..." : "Soumettre le rapport"}
      </button>
    </form>
  );
}
