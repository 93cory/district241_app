import { backendRequest } from "@/lib/backend";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    p1_start?: string;
    p1_end?: string;
    p2_start?: string;
    p2_end?: string;
  }>;
}

export default async function ComparisonPage({ searchParams }: Props) {
  const params = await searchParams;
  const { p1_start, p1_end, p2_start, p2_end } = params;
  const hasParams = p1_start && p1_end && p2_start && p2_end;

  let data: any = null;
  let error = "";

  if (hasParams) {
    try {
      const res = await backendRequest(
        `/pnpi/dashboard/comparison?period1_start=${p1_start}&period1_end=${p1_end}&period2_start=${p2_start}&period2_end=${p2_end}`,
      );
      if (res.ok) data = await res.json();
      else error = "Erreur de chargement.";
    } catch {
      error = "Erreur de connexion.";
    }
  }

  const LABELS: Record<string, string> = {
    soumissions: "Soumissions ATI",
    approuves: "Approuves",
    rejetes: "Rejetes",
    taux_approbation: "Taux approbation (%)",
    inspections: "Inspections",
    conformes: "Conformes",
    taux_conformite: "Taux conformite (%)",
    delai_moyen_jours: "Delai moyen (jours)",
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Comparaison Periodique</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 24px" }}>
        Comparez les performances entre deux periodes (trimestres, semestres, annees).
      </p>

      <form style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <fieldset
          style={{ border: "1.5px solid var(--line, #dce4ef)", borderRadius: 14, padding: 16 }}
        >
          <legend style={{ fontWeight: 700, fontSize: 13 }}>Periode 1</legend>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="date"
              name="p1_start"
              defaultValue={p1_start || ""}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--line, #dce4ef)",
              }}
            />
            <input
              type="date"
              name="p1_end"
              defaultValue={p1_end || ""}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--line, #dce4ef)",
              }}
            />
          </div>
        </fieldset>
        <fieldset
          style={{ border: "1.5px solid var(--line, #dce4ef)", borderRadius: 14, padding: 16 }}
        >
          <legend style={{ fontWeight: 700, fontSize: 13 }}>Periode 2</legend>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="date"
              name="p2_start"
              defaultValue={p2_start || ""}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--line, #dce4ef)",
              }}
            />
            <input
              type="date"
              name="p2_end"
              defaultValue={p2_end || ""}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--line, #dce4ef)",
              }}
            />
          </div>
        </fieldset>
        <div style={{ gridColumn: "1 / -1", textAlign: "center" }}>
          <button
            type="submit"
            style={{
              padding: "10px 28px",
              borderRadius: 12,
              border: "none",
              background: "#006233",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Comparer
          </button>
        </div>
      </form>

      {error && (
        <div style={{ padding: 14, borderRadius: 12, background: "#fff5f5", color: "#b42318" }}>
          {error}
        </div>
      )}

      {data && (
        <div className="chart-card" style={{ padding: 20 }}>
          <div className="table-scroll" style={{ overflowX: "auto" }}>
            <table className="annex-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Indicateur</th>
                  <th>Periode 1</th>
                  <th>Periode 2</th>
                  <th>Evolution</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(LABELS).map(([key, label]) => {
                  const v1 = data.period1.stats[key];
                  const v2 = data.period2.stats[key];
                  const delta = data.deltas_pct[key];
                  const positive = key === "delai_moyen_jours" ? delta < 0 : delta > 0;
                  return (
                    <tr key={key}>
                      <td style={{ fontWeight: 600 }}>{label}</td>
                      <td style={{ textAlign: "center" }}>{v1}</td>
                      <td style={{ textAlign: "center" }}>{v2}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background: delta === 0 ? "#f3f4f6" : positive ? "#dcfce7" : "#fef2f2",
                            color: delta === 0 ? "#526175" : positive ? "#166534" : "#b42318",
                          }}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
