"use client";
import { useRouter } from "next/navigation";

const STATUTS_CONF = [
  { value: "conforme", label: "Conforme" },
  { value: "non_conforme", label: "Non conforme" },
  { value: "partiel", label: "Partiel" },
];

export function InspectionsFiltersClient({
  statut_conformite,
  inspecteur,
}: {
  statut_conformite: string;
  inspecteur: string;
}) {
  const router = useRouter();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (key !== "statut_conformite" && statut_conformite)
      params.set("statut_conformite", statut_conformite);
    if (key !== "inspecteur" && inspecteur) params.set("inspecteur", inspecteur);
    if (value) params.set(key, value);
    router.push(`/pnpi/inspections${params.toString() ? "?" + params.toString() : ""}`);
  };

  const hasFilters = Boolean(statut_conformite || inspecteur);

  return (
    <div className="pnpi-filter-bar">
      <div className="pnpi-form-field">
        <label htmlFor="insp-filter-statut" className="pnpi-form-label">
          Conformite
        </label>
        <select
          id="insp-filter-statut"
          className="pnpi-form-select"
          value={statut_conformite}
          onChange={(e) => update("statut_conformite", e.target.value)}
        >
          <option value="">Tous statuts</option>
          {STATUTS_CONF.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="insp-filter-inspecteur" className="pnpi-form-label">
          Inspecteur
        </label>
        <input
          id="insp-filter-inspecteur"
          className="pnpi-form-input"
          value={inspecteur}
          onChange={(e) => update("inspecteur", e.target.value)}
          placeholder="Nom d'utilisateur"
        />
      </div>

      {hasFilters && (
        <div className="pnpi-filter-bar-actions">
          <button
            type="button"
            className="pnpi-filter-btn"
            onClick={() => router.push("/pnpi/inspections")}
          >
            Reinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
