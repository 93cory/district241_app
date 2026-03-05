"use client";
import { useRouter } from "next/navigation";

const STATUTS_CONF = [{ value: "conforme", label: "Conforme" }, { value: "non_conforme", label: "Non conforme" }, { value: "partiel", label: "Partiel" }];

export function InspectionsFiltersClient({ statut_conformite, inspecteur }: { statut_conformite: string; inspecteur: string }) {
  const router = useRouter();
  const update = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (key !== "statut_conformite" && statut_conformite) params.set("statut_conformite", statut_conformite);
    if (key !== "inspecteur" && inspecteur) params.set("inspecteur", inspecteur);
    if (value) params.set(key, value);
    router.push(`/pnpi/inspections${params.toString() ? "?" + params.toString() : ""}`);
  };
  const sel = (style?: React.CSSProperties): React.CSSProperties => ({ padding: "0.4rem 0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "0.8rem", background: "white", cursor: "pointer", ...style });
  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <select value={statut_conformite} onChange={e => update("statut_conformite", e.target.value)} style={sel()}>
        <option value="">Tous statuts</option>
        {STATUTS_CONF.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <input value={inspecteur} onChange={e => update("inspecteur", e.target.value)} placeholder="Inspecteur..." style={{ ...sel(), minWidth: "160px" }} />
      {(statut_conformite || inspecteur) && (
        <button onClick={() => router.push("/pnpi/inspections")} style={{ ...sel({ background: "#f9fafb", color: "#6b7280" }) }}>&#x2715; Effacer</button>
      )}
    </div>
  );
}
