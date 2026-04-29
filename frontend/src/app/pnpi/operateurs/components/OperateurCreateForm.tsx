"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const SECTEURS = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const PROVINCES = [
  "estuaire",
  "haut_ogooue",
  "ogooue_maritime",
  "woleu_ntem",
  "moyen_ogooue",
  "ngounie",
  "nyanga",
  "ogooue_ivindo",
  "ogooue_lolo",
];
const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois & Foret",
  mines: "Mines",
  agroalimentaire: "Agro-alimentaire",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};
const PROVINCE_LABELS: Record<string, string> = {
  estuaire: "Estuaire",
  haut_ogooue: "Haut-Ogooue",
  ogooue_maritime: "Ogooue-Maritime",
  woleu_ntem: "Woleu-Ntem",
  moyen_ogooue: "Moyen-Ogooue",
  ngounie: "Ngounie",
  nyanga: "Nyanga",
  ogooue_ivindo: "Ogooue-Ivindo",
  ogooue_lolo: "Ogooue-Lolo",
};

export function OperateurCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const [nif, setNif] = useState("");
  const [raison, setRaison] = useState("");
  const [secteur, setSecteur] = useState("");
  const [province, setProvince] = useState("");
  const [ville, setVille] = useState("");
  const [effectif, setEffectif] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const reset = () => {
    setNif("");
    setRaison("");
    setSecteur("");
    setProvince("");
    setVille("");
    setEffectif("");
    setEmail("");
    setTel("");
    setLat("");
    setLng("");
    setError(null);
    setSuccess(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/pnpi/operateurs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nif_gabon: nif,
          raison_sociale: raison,
          secteur,
          province,
          ville,
          effectif_declare: effectif ? parseInt(effectif, 10) : null,
          contact_email: email || null,
          contact_telephone: tel || null,
          latitude: lat ? parseFloat(lat) : null,
          longitude: lng ? parseFloat(lng) : null,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? `Erreur ${res.status}`);
        return;
      }
      setSuccess(`Operateur "${raison}" enregistre (${data.id}).`);
      reset();
      onCreated?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <span aria-hidden="true">+</span> Nouvel operateur
      </button>
    );
  }

  return (
    <div className="pnpi-form-panel">
      <div className="pnpi-form-panel-head">
        <h3 className="pnpi-card-subtitle">Enregistrer un operateur industriel</h3>
        <button
          type="button"
          onClick={close}
          className="pnpi-form-close"
          aria-label="Fermer le formulaire"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
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
          <div className="pnpi-form-field">
            <label htmlFor="op-nif" className="pnpi-form-label pnpi-form-label-req">
              NIF Gabon
            </label>
            <input
              id="op-nif"
              className="pnpi-form-input"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              required
              placeholder="ex : TF-2024-01234"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-raison" className="pnpi-form-label pnpi-form-label-req">
              Raison sociale
            </label>
            <input
              id="op-raison"
              className="pnpi-form-input"
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              required
              placeholder="Nom de l'entreprise"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-secteur" className="pnpi-form-label pnpi-form-label-req">
              Secteur
            </label>
            <select
              id="op-secteur"
              className="pnpi-form-select"
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              required
            >
              <option value="">Choisir un secteur</option>
              {SECTEURS.map((s) => (
                <option key={s} value={s}>
                  {SECTEUR_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-province" className="pnpi-form-label pnpi-form-label-req">
              Province
            </label>
            <select
              id="op-province"
              className="pnpi-form-select"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              required
            >
              <option value="">Choisir une province</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {PROVINCE_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-ville" className="pnpi-form-label pnpi-form-label-req">
              Ville
            </label>
            <input
              id="op-ville"
              className="pnpi-form-input"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              required
              placeholder="ex : Libreville"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-effectif" className="pnpi-form-label">
              Effectif declare
            </label>
            <input
              id="op-effectif"
              className="pnpi-form-input"
              value={effectif}
              onChange={(e) => setEffectif(e.target.value)}
              type="number"
              min="0"
              placeholder="Nombre d'employes"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-email" className="pnpi-form-label">
              Email de contact
            </label>
            <input
              id="op-email"
              className="pnpi-form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="contact@entreprise.ga"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-tel" className="pnpi-form-label">
              Telephone
            </label>
            <input
              id="op-tel"
              className="pnpi-form-input"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              placeholder="+241 01 XX XX XX"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-lat" className="pnpi-form-label">
              Latitude GPS
            </label>
            <input
              id="op-lat"
              className="pnpi-form-input"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              type="number"
              step="0.00001"
              placeholder="ex : -0.72345"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="op-lng" className="pnpi-form-label">
              Longitude GPS
            </label>
            <input
              id="op-lng"
              className="pnpi-form-input"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              type="number"
              step="0.00001"
              placeholder="ex : 9.45678"
            />
          </div>
        </div>

        <div className="pnpi-form-actions">
          <button type="button" onClick={close} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Enregistrement..." : "Enregistrer l'operateur"}
          </button>
        </div>
      </form>
    </div>
  );
}
