"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "representants" | "sites" | "produits" | "ressources" | "investissements";

const KIND_LABELS: Record<Kind, string> = {
  representants: "Représentant",
  sites: "Site industriel",
  produits: "Produit / capacité",
  ressources: "Ressource / énergie",
  investissements: "Investissement",
};

const PROVINCES = [
  "estuaire",
  "haut_ogooue",
  "moyen_ogooue",
  "ngounie",
  "nyanga",
  "ogooue_ivindo",
  "ogooue_lolo",
  "ogooue_maritime",
  "woleu_ntem",
];

const toNumberOrNull = (value: FormDataEntryValue | null): number | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringOrNull = (value: FormDataEntryValue | null): string | null => {
  const raw = String(value ?? "").trim();
  return raw || null;
};

export function RINQuickAddForm({ operateurId }: { operateurId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("representants");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const title = useMemo(() => `Ajouter · ${KIND_LABELS[kind]}`, [kind]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    let payload: Record<string, unknown>;

    if (kind === "representants") {
      payload = {
        nom_complet: String(form.get("nom_complet") ?? "").trim(),
        fonction: String(form.get("fonction") ?? "").trim(),
        email: toStringOrNull(form.get("email")),
        telephone: toStringOrNull(form.get("telephone")),
        est_contact_principal: form.get("est_contact_principal") === "on",
      };
    } else if (kind === "sites") {
      payload = {
        nom_site: String(form.get("nom_site") ?? "").trim(),
        type_site: String(form.get("type_site") ?? "usine").trim(),
        province: String(form.get("province") ?? "").trim(),
        ville: String(form.get("ville") ?? "").trim(),
        adresse: toStringOrNull(form.get("adresse")),
        latitude: toNumberOrNull(form.get("latitude")),
        longitude: toNumberOrNull(form.get("longitude")),
        superficie_ha: toNumberOrNull(form.get("superficie_ha")),
        statut: String(form.get("statut") ?? "actif").trim(),
      };
    } else if (kind === "produits") {
      payload = {
        nom_produit: String(form.get("nom_produit") ?? "").trim(),
        categorie: String(form.get("categorie") ?? "").trim(),
        unite: String(form.get("unite") ?? "tonne").trim(),
        capacite_annuelle: toNumberOrNull(form.get("capacite_annuelle")),
        production_annuelle: toNumberOrNull(form.get("production_annuelle")),
        marche_cible: toStringOrNull(form.get("marche_cible")),
        certification: toStringOrNull(form.get("certification")),
      };
    } else if (kind === "ressources") {
      payload = {
        type_ressource: String(form.get("type_ressource") ?? "energie").trim(),
        libelle: String(form.get("libelle") ?? "").trim(),
        origine: toStringOrNull(form.get("origine")),
        consommation_annuelle: toNumberOrNull(form.get("consommation_annuelle")),
        unite: toStringOrNull(form.get("unite")),
        dependance_import: form.get("dependance_import") === "on",
      };
    } else {
      payload = {
        intitule: String(form.get("intitule") ?? "").trim(),
        montant_fcfa: toNumberOrNull(form.get("montant_fcfa")),
        statut: String(form.get("statut") ?? "planifie").trim(),
        annee: toNumberOrNull(form.get("annee")),
        emplois_prevus: toNumberOrNull(form.get("emplois_prevus")),
        description: toStringOrNull(form.get("description")),
      };
    }

    try {
      const response = await fetch(`/api/pnpi/rin/operateurs/${operateurId}/${kind}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.detail ?? `Erreur ${response.status}`);
        return;
      }
      setSuccess(`${KIND_LABELS[kind]} ajouté au RIN.`);
      event.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Ajouter une donnée RIN
      </button>
    );
  }

  return (
    <div className="pnpi-form-panel" style={{ marginTop: "1rem" }}>
      <div className="pnpi-form-panel-head">
        <h3 className="pnpi-card-subtitle">{title}</h3>
        <button
          type="button"
          className="pnpi-form-close"
          onClick={() => {
            setOpen(false);
            setError(null);
            setSuccess(null);
          }}
          aria-label="Fermer le formulaire RIN"
        >
          ×
        </button>
      </div>

      <div className="pnpi-form-field" style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="rin-kind" className="pnpi-form-label">
          Type de donnée
        </label>
        <select
          id="rin-kind"
          className="pnpi-form-select"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as Kind);
            setError(null);
            setSuccess(null);
          }}
        >
          {(Object.keys(KIND_LABELS) as Kind[]).map((key) => (
            <option key={key} value={key}>
              {KIND_LABELS[key]}
            </option>
          ))}
        </select>
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

      <form onSubmit={handleSubmit}>
        <div className="pnpi-form-grid">
          {kind === "representants" && (
            <>
              <Field name="nom_complet" label="Nom complet" required />
              <Field name="fonction" label="Fonction" required placeholder="Directeur industriel" />
              <Field name="email" label="Email" type="email" />
              <Field name="telephone" label="Téléphone" />
              <label className="pnpi-form-label" style={{ display: "flex", gap: "0.5rem" }}>
                <input name="est_contact_principal" type="checkbox" /> Contact principal
              </label>
            </>
          )}

          {kind === "sites" && (
            <>
              <Field name="nom_site" label="Nom du site" required />
              <Field name="type_site" label="Type" required defaultValue="usine" />
              <Select name="province" label="Province" options={PROVINCES} required />
              <Field name="ville" label="Ville" required />
              <Field name="adresse" label="Adresse" />
              <Field name="latitude" label="Latitude" type="number" step="0.00001" />
              <Field name="longitude" label="Longitude" type="number" step="0.00001" />
              <Field name="superficie_ha" label="Superficie (ha)" type="number" step="0.01" />
              <Field name="statut" label="Statut" defaultValue="actif" />
            </>
          )}

          {kind === "produits" && (
            <>
              <Field name="nom_produit" label="Produit" required />
              <Field name="categorie" label="Catégorie" required />
              <Field name="unite" label="Unité" required defaultValue="tonne" />
              <Field name="capacite_annuelle" label="Capacité annuelle" type="number" step="0.01" />
              <Field name="production_annuelle" label="Production annuelle" type="number" step="0.01" />
              <Field name="marche_cible" label="Marché cible" placeholder="local, export, local_export" />
              <Field name="certification" label="Certification" placeholder="AGANOR, ISO, FSC..." />
            </>
          )}

          {kind === "ressources" && (
            <>
              <Select
                name="type_ressource"
                label="Type"
                options={["energie", "matiere_premiere"]}
                required
              />
              <Field name="libelle" label="Libellé" required />
              <Field name="origine" label="Origine" />
              <Field name="consommation_annuelle" label="Consommation annuelle" type="number" step="0.01" />
              <Field name="unite" label="Unité" placeholder="MWh, tonne, m3..." />
              <label className="pnpi-form-label" style={{ display: "flex", gap: "0.5rem" }}>
                <input name="dependance_import" type="checkbox" /> Dépendance import
              </label>
            </>
          )}

          {kind === "investissements" && (
            <>
              <Field name="intitule" label="Intitulé" required />
              <Field name="montant_fcfa" label="Montant FCFA" type="number" />
              <Select name="statut" label="Statut" options={["planifie", "en_cours", "realise"]} required />
              <Field name="annee" label="Année" type="number" />
              <Field name="emplois_prevus" label="Emplois prévus" type="number" />
              <div className="pnpi-form-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="rin-description" className="pnpi-form-label">
                  Description
                </label>
                <textarea id="rin-description" name="description" className="pnpi-form-textarea" rows={3} />
              </div>
            </>
          )}
        </div>

        <div className="pnpi-form-actions">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Fermer
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Enregistrement..." : "Enregistrer dans le RIN"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  required,
  type = "text",
  step,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  step?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="pnpi-form-field">
      <label htmlFor={`rin-${name}`} className={`pnpi-form-label ${required ? "pnpi-form-label-req" : ""}`}>
        {label}
      </label>
      <input
        id={`rin-${name}`}
        name={name}
        className="pnpi-form-input"
        required={required}
        type={type}
        step={step}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </div>
  );
}

function Select({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="pnpi-form-field">
      <label htmlFor={`rin-${name}`} className={`pnpi-form-label ${required ? "pnpi-form-label-req" : ""}`}>
        {label}
      </label>
      <select id={`rin-${name}`} name={name} className="pnpi-form-select" required={required}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
