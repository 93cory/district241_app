"use client";
import { useState, useTransition } from "react";
import { createATI } from "../actions";
import type { OperateurBrief } from "../../../../lib/api";
import { useToast } from "../../../components/Toast";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { TemplateSelector } from "../TemplateSelector";

const SECTEURS = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois & Foret",
  mines: "Mines",
  agroalimentaire: "Agro-alimentaire",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};

interface ATIFormData {
  operateur_id: string;
  type_activite: string;
  secteur: string;
  priorite: string;
  observations?: string;
}

interface Template {
  nom: string;
  secteur?: string;
  type_activite?: string;
}

export function ATICreateForm({ operateurs }: { operateurs: OperateurBrief[] }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<ATIFormData | null>(null);
  const [pendingForm, setPendingForm] = useState<HTMLFormElement | null>(null);
  const { showToast } = useToast();

  const handleTemplate = (tpl: Template) => {
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;
    const secteurSelect = form.querySelector<HTMLSelectElement>("[name=secteur]");
    const typeInput = form.querySelector<HTMLInputElement>("[name=type_activite]");
    if (secteurSelect && tpl.secteur) {
      const mapping: Record<string, string> = {
        bois: "bois",
        mines: "mines",
        agroalimentaire: "agroalimentaire",
        peche: "services",
        chimie: "services",
        btp: "btp",
        energie: "services",
      };
      secteurSelect.value = mapping[tpl.secteur] || tpl.secteur;
    }
    if (typeInput && tpl.type_activite) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(typeInput, tpl.type_activite);
        typeInput.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        typeInput.value = tpl.type_activite;
      }
    }
    showToast(`Modele "${tpl.nom}" applique`, "success");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: ATIFormData = {
      operateur_id: fd.get("operateur_id") as string,
      type_activite: fd.get("type_activite") as string,
      secteur: fd.get("secteur") as string,
      priorite: fd.get("priorite") as string,
      observations: (fd.get("observations") as string) || undefined,
    };
    if (!data.operateur_id || !data.type_activite || !data.secteur) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setError(null);
    setSuccess(null);
    setPendingData(data);
    setPendingForm(e.currentTarget);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    if (!pendingData || !pendingForm) return;
    const data = pendingData;
    const form = pendingForm;
    startTransition(async () => {
      try {
        const result = (await createATI(data)) as { numero_ati: string };
        setSuccess(`ATI ${result.numero_ati} soumis avec succes !`);
        showToast(`ATI ${result.numero_ati} soumis avec succes !`, "success");
        form.reset();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la soumission";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setPendingData(null);
        setPendingForm(null);
      }
    });
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingData(null);
    setPendingForm(null);
  };

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Soumettre cet ATI ?"
        message="Cette action va enregistrer la demande d'agrement. Voulez-vous continuer ?"
        confirmLabel="Soumettre"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <TemplateSelector onSelect={handleTemplate} />

      <form onSubmit={handleSubmit} className="pnpi-form-stack">
        <div className="pnpi-form-field">
          <label htmlFor="ati-operateur" className="pnpi-form-label pnpi-form-label-req">
            Operateur industriel
          </label>
          <select id="ati-operateur" name="operateur_id" required className="pnpi-form-select">
            <option value="">Selectionner un operateur</option>
            {operateurs.map((op) => (
              <option key={op.id} value={op.id}>
                {op.raison_sociale} · {op.province.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="pnpi-form-field">
          <label htmlFor="ati-type" className="pnpi-form-label pnpi-form-label-req">
            Type d&apos;activite
          </label>
          <input
            id="ati-type"
            name="type_activite"
            type="text"
            required
            className="pnpi-form-input"
            placeholder="Ex : Transformation du bois en planches sciees"
          />
        </div>

        <div className="pnpi-form-grid">
          <div className="pnpi-form-field">
            <label htmlFor="ati-secteur" className="pnpi-form-label pnpi-form-label-req">
              Secteur
            </label>
            <select id="ati-secteur" name="secteur" required className="pnpi-form-select">
              <option value="">Selectionner</option>
              {SECTEURS.map((s) => (
                <option key={s} value={s}>
                  {SECTEUR_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="ati-priorite" className="pnpi-form-label">
              Priorite
            </label>
            <select
              id="ati-priorite"
              name="priorite"
              className="pnpi-form-select"
              defaultValue="normale"
            >
              <option value="normale">Normale</option>
              <option value="elevee">Elevee</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div className="pnpi-form-field">
          <label htmlFor="ati-observations" className="pnpi-form-label">
            Observations / Justification
          </label>
          <textarea
            id="ati-observations"
            name="observations"
            rows={3}
            className="pnpi-form-textarea"
            placeholder="Informations complementaires sur la demande..."
          />
        </div>

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

        <div className="pnpi-form-actions pnpi-form-actions--start">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Soumission en cours..." : "Soumettre la demande ATI"}
          </button>
        </div>
      </form>
    </>
  );
}
