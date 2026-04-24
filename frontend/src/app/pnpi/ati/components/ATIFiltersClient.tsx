"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const STATUTS = ["", "soumis", "en_instruction", "en_validation", "approuve", "rejete", "expire"];
const STATUT_LABELS: Record<string, string> = {
  "": "Tous les statuts",
  soumis: "Soumis",
  en_instruction: "En instruction",
  en_validation: "En validation",
  approuve: "Approuve",
  rejete: "Rejete",
  expire: "Expire",
};
const SECTEURS = ["", "bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const SECTEUR_LABELS: Record<string, string> = {
  "": "Tous secteurs",
  bois: "Bois & Foret",
  mines: "Mines",
  agroalimentaire: "Agro-alimentaire",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};
const PROVINCES = [
  "",
  "estuaire",
  "haut_ogooue",
  "ogooue_maritime",
  "ngounie",
  "nyanga",
  "moyen_ogooue",
  "ogooue_lolo",
  "ogooue_ivindo",
  "woleu_ntem",
];
const PRIORITES = ["", "normale", "elevee", "urgente"];
const PRIORITE_LABELS: Record<string, string> = {
  "": "Toutes priorites",
  normale: "Normale",
  elevee: "Elevee",
  urgente: "Urgente",
};

interface ATIFiltersClientProps {
  statut: string;
  secteur: string;
  province: string;
  priorite?: string;
  date_from?: string;
  date_to?: string;
}

const capitalize = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function ATIFiltersClient({
  statut,
  secteur,
  province,
  priorite = "",
  date_from = "",
  date_to = "",
}: ATIFiltersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const hasFilters = Boolean(statut || secteur || province || priorite || date_from || date_to);

  return (
    <div className="pnpi-filter-bar">
      <div className="pnpi-form-field">
        <label htmlFor="ati-filter-statut" className="pnpi-form-label">
          Statut
        </label>
        <select
          id="ati-filter-statut"
          className="pnpi-form-select"
          value={statut}
          onChange={(e) => updateFilter("statut", e.target.value)}
        >
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="ati-filter-secteur" className="pnpi-form-label">
          Secteur
        </label>
        <select
          id="ati-filter-secteur"
          className="pnpi-form-select"
          value={secteur}
          onChange={(e) => updateFilter("secteur", e.target.value)}
        >
          {SECTEURS.map((s) => (
            <option key={s} value={s}>
              {SECTEUR_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="ati-filter-province" className="pnpi-form-label">
          Province
        </label>
        <select
          id="ati-filter-province"
          className="pnpi-form-select"
          value={province}
          onChange={(e) => updateFilter("province", e.target.value)}
        >
          <option value="">Toutes provinces</option>
          {PROVINCES.slice(1).map((p) => (
            <option key={p} value={p}>
              {capitalize(p.replace(/_/g, " "))}
            </option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="ati-filter-priorite" className="pnpi-form-label">
          Priorite
        </label>
        <select
          id="ati-filter-priorite"
          className="pnpi-form-select"
          value={priorite}
          onChange={(e) => updateFilter("priorite", e.target.value)}
        >
          {PRIORITES.map((p) => (
            <option key={p} value={p}>
              {PRIORITE_LABELS[p] ?? p}
            </option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="ati-filter-date-from" className="pnpi-form-label">
          Du
        </label>
        <input
          id="ati-filter-date-from"
          type="date"
          className="pnpi-form-input"
          value={date_from}
          onChange={(e) => updateFilter("date_from", e.target.value)}
        />
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="ati-filter-date-to" className="pnpi-form-label">
          Au
        </label>
        <input
          id="ati-filter-date-to"
          type="date"
          className="pnpi-form-input"
          value={date_to}
          onChange={(e) => updateFilter("date_to", e.target.value)}
        />
      </div>

      {hasFilters && (
        <div className="pnpi-filter-bar-actions">
          <button type="button" className="pnpi-filter-btn" onClick={() => router.push(pathname)}>
            Reinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
