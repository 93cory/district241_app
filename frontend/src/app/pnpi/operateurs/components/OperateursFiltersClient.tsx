"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

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
  "", "estuaire", "haut_ogooue", "ogooue_maritime", "ngounie", "nyanga",
  "moyen_ogooue", "ogooue_lolo", "ogooue_ivindo", "woleu_ntem",
];

export function OperateursFiltersClient({
  secteur,
  province,
}: {
  secteur: string;
  province: string;
}) {
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
    [pathname, router, searchParams]
  );

  const hasFilters = Boolean(secteur || province);

  return (
    <div className="pnpi-filter-bar">
      <div className="pnpi-form-field">
        <label htmlFor="op-filter-secteur" className="pnpi-form-label">Secteur</label>
        <select
          id="op-filter-secteur"
          className="pnpi-form-select"
          value={secteur}
          onChange={(e) => updateFilter("secteur", e.target.value)}
        >
          {SECTEURS.map((s) => (
            <option key={s} value={s}>{SECTEUR_LABELS[s] ?? s}</option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="op-filter-province" className="pnpi-form-label">Province</label>
        <select
          id="op-filter-province"
          className="pnpi-form-select"
          value={province}
          onChange={(e) => updateFilter("province", e.target.value)}
        >
          <option value="">Toutes provinces</option>
          {PROVINCES.slice(1).map((p) => (
            <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <div className="pnpi-filter-bar-actions">
          <button
            type="button"
            className="pnpi-filter-btn"
            onClick={() => router.push(pathname)}
          >
            Reinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
