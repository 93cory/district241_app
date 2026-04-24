"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createATI } from "../actions";
import type { OperateurBrief } from "../../../../lib/api";
import { useToast } from "../../../components/Toast";

const SECTEURS = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois & Foret",
  mines: "Mines",
  agroalimentaire: "Agro-alimentaire",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};

const STEPS = [
  { key: "operateur", label: "Operateur" },
  { key: "activite", label: "Activite & secteur" },
  { key: "resume", label: "Confirmation" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface FormData {
  operateur_id: string;
  type_activite: string;
  secteur: string;
  priorite: string;
  observations: string;
}

interface DelayEstimate {
  secteur: string;
  delai_median: number;
  delai_moyen: number;
  nb_dossiers: number;
}

export function ATIWizard({
  operateurs,
  delays,
}: {
  operateurs: OperateurBrief[];
  delays: DelayEstimate[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<StepKey>("operateur");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    operateur_id: "",
    type_activite: "",
    secteur: "",
    priorite: "normale",
    observations: "",
  });

  const selectedOperateur = operateurs.find((o) => o.id === form.operateur_id);
  const delayEstimate = form.secteur ? delays.find((d) => d.secteur === form.secteur) : null;

  const canProceedFrom = (s: StepKey): boolean => {
    if (s === "operateur") return Boolean(form.operateur_id);
    if (s === "activite") return Boolean(form.type_activite.trim() && form.secteur);
    return true;
  };

  const next = () => {
    if (step === "operateur" && canProceedFrom("operateur")) setStep("activite");
    else if (step === "activite" && canProceedFrom("activite")) setStep("resume");
  };

  const prev = () => {
    if (step === "resume") setStep("activite");
    else if (step === "activite") setStep("operateur");
  };

  const submit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = (await createATI(form)) as { numero_ati: string; id: string };
        setSuccess(`ATI ${result.numero_ati} soumis avec succes !`);
        showToast(`ATI ${result.numero_ati} soumis !`, "success");
        setTimeout(() => router.push(`/pnpi/ati/${result.id}`), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la soumission");
      }
    });
  };

  return (
    <div className="ati-wizard">
      {/* Stepper */}
      <ol className="ati-wizard-steps">
        {STEPS.map((s, i) => {
          const idx = STEPS.findIndex((x) => x.key === step);
          const status = i < idx ? "done" : i === idx ? "current" : "pending";
          return (
            <li key={s.key} className={`ati-wizard-step is-${status}`}>
              <span className="ati-wizard-step-num">{i + 1}</span>
              <span className="ati-wizard-step-label">{s.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <div className="ati-wizard-body">
        {step === "operateur" && (
          <div className="pnpi-form-stack">
            <h3 className="pnpi-card-subtitle">Quel operateur industriel ?</h3>
            <p className="pnpi-page-sub" style={{ marginTop: "-0.5rem" }}>
              Selectionnez l&apos;entreprise pour laquelle vous deposez cette demande d&apos;ATI.
            </p>
            <div className="pnpi-form-field">
              <label htmlFor="w-op" className="pnpi-form-label pnpi-form-label-req">
                Operateur
              </label>
              <select
                id="w-op"
                className="pnpi-form-select"
                value={form.operateur_id}
                onChange={(e) => setForm((f) => ({ ...f, operateur_id: e.target.value }))}
                size={Math.min(operateurs.length, 10)}
              >
                {operateurs.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.raison_sociale} · {op.province.replace(/_/g, " ")} · {op.secteur}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === "activite" && (
          <div className="pnpi-form-stack">
            <h3 className="pnpi-card-subtitle">Nature de l&apos;activite</h3>
            <div className="pnpi-form-field">
              <label htmlFor="w-act" className="pnpi-form-label pnpi-form-label-req">
                Type d&apos;activite
              </label>
              <input
                id="w-act"
                type="text"
                className="pnpi-form-input"
                placeholder="Ex : Transformation du bois en planches sciees"
                value={form.type_activite}
                onChange={(e) => setForm((f) => ({ ...f, type_activite: e.target.value }))}
                required
              />
            </div>

            <div className="pnpi-form-grid">
              <div className="pnpi-form-field">
                <label htmlFor="w-sec" className="pnpi-form-label pnpi-form-label-req">
                  Secteur
                </label>
                <select
                  id="w-sec"
                  className="pnpi-form-select"
                  value={form.secteur}
                  onChange={(e) => setForm((f) => ({ ...f, secteur: e.target.value }))}
                  required
                >
                  <option value="">Selectionner</option>
                  {SECTEURS.map((s) => (
                    <option key={s} value={s}>
                      {SECTEUR_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pnpi-form-field">
                <label htmlFor="w-prio" className="pnpi-form-label">
                  Priorite
                </label>
                <select
                  id="w-prio"
                  className="pnpi-form-select"
                  value={form.priorite}
                  onChange={(e) => setForm((f) => ({ ...f, priorite: e.target.value }))}
                >
                  <option value="normale">Normale (SLA 30 jours)</option>
                  <option value="elevee">Elevee (SLA 21 jours)</option>
                  <option value="urgente">Urgente (SLA 14 jours)</option>
                </select>
              </div>
            </div>

            {delayEstimate && (
              <div className="pnpi-form-alert pnpi-form-alert--info" role="status">
                <div>
                  <strong>Delai de traitement estime</strong>
                  <p style={{ margin: "0.25rem 0 0" }}>
                    Secteur <strong>{SECTEUR_LABELS[form.secteur]}</strong> : mediane{" "}
                    <strong>{delayEstimate.delai_median}j</strong>, moyenne{" "}
                    {delayEstimate.delai_moyen}j (sur {delayEstimate.nb_dossiers} dossier
                    {delayEstimate.nb_dossiers > 1 ? "s" : ""} traites).
                  </p>
                </div>
              </div>
            )}

            <div className="pnpi-form-field">
              <label htmlFor="w-obs" className="pnpi-form-label">
                Observations / Justification (optionnel)
              </label>
              <textarea
                id="w-obs"
                className="pnpi-form-textarea"
                rows={3}
                placeholder="Informations complementaires..."
                value={form.observations}
                onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === "resume" && (
          <div className="pnpi-form-stack">
            <h3 className="pnpi-card-subtitle">Verification avant soumission</h3>
            <dl className="ati-wizard-summary">
              <dt>Operateur</dt>
              <dd>
                {selectedOperateur?.raison_sociale} &middot;{" "}
                {selectedOperateur?.province.replace(/_/g, " ")}
              </dd>
              <dt>Secteur</dt>
              <dd>{SECTEUR_LABELS[form.secteur] ?? form.secteur}</dd>
              <dt>Type d&apos;activite</dt>
              <dd>{form.type_activite}</dd>
              <dt>Priorite</dt>
              <dd>{form.priorite}</dd>
              {form.observations && (
                <>
                  <dt>Observations</dt>
                  <dd>{form.observations}</dd>
                </>
              )}
              {delayEstimate && (
                <>
                  <dt>Delai estime</dt>
                  <dd>~{delayEstimate.delai_median} jours (mediane secteur)</dd>
                </>
              )}
            </dl>

            {error && (
              <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="pnpi-form-alert pnpi-form-alert--success" role="status">
                {success}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pnpi-form-actions pnpi-form-actions--between">
        <button
          type="button"
          className="btn-secondary"
          onClick={prev}
          disabled={step === "operateur" || isPending}
        >
          &larr; Precedent
        </button>

        {step !== "resume" ? (
          <button
            type="button"
            className="btn-primary"
            onClick={next}
            disabled={!canProceedFrom(step)}
          >
            Suivant &rarr;
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={isPending || Boolean(success)}
          >
            {isPending ? "Soumission..." : "Soumettre la demande ATI"}
          </button>
        )}
      </div>
    </div>
  );
}
