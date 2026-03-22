import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function EconomicImpactPage() {
  let data: any = null;
  try {
    const res = await backendRequest("/pnpi/dashboard/economic-impact");
    if (res.ok) data = await res.json();
  } catch {}

  if (!data) return <div style={{ padding: 32 }}>Erreur de chargement.</div>;
  const s = data.summary;
  const growthColor = s.croissance_emploi_pct >= 0 ? "#006233" : "#b42318";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Impact economique</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        Estimations basees sur les ATI approuves et les multiplicateurs sectoriels.
      </p>

      {/* Hero KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Emplois estimes", value: s.emplois_estimes.toLocaleString("fr-FR"), color: "#006233", icon: "\u{1F477}" },
          { label: "Investissement", value: `${(s.investissement_mfcfa / 1000).toFixed(1)} Mds FCFA`, color: "#0c7eb4", icon: "\u{1F4B0}" },
          { label: "ATIs approuves", value: s.atis_approuves, color: "#051B36", icon: "\u{1F4CB}" },
          { label: "Operateurs", value: s.operateurs_actifs, color: "#7c3aed", icon: "\u{1F3ED}" },
        ].map(k => (
          <div key={k.label} className="chart-card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 22 }}>{k.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-soft)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* YoY comparison */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Croissance annuelle emplois</h3>
        <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#006233" }}>{s.emplois_cette_annee}</div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{new Date().getFullYear()}</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-soft, #9ca3af)" }}>{s.emplois_annee_precedente}</div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{new Date().getFullYear() - 1}</div>
          </div>
          <span style={{
            padding: "4px 12px", borderRadius: 8, fontSize: 14, fontWeight: 800,
            background: `${growthColor}12`, color: growthColor,
          }}>
            {s.croissance_emploi_pct > 0 ? "+" : ""}{s.croissance_emploi_pct}%
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* By sector */}
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Par secteur</h3>
          {data.by_sector.map((s: any) => (
            <div key={s.secteur} style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: "1px solid var(--line, #eee)", fontSize: 12,
            }}>
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{s.secteur}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span>{s.jobs} emplois</span>
                <span style={{ color: "var(--text-soft)" }}>{s.investment} MFCFA</span>
              </div>
            </div>
          ))}
        </div>

        {/* By province */}
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Par province</h3>
          {data.by_province.map((p: any) => (
            <div key={p.province} style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: "1px solid var(--line, #eee)", fontSize: 12,
            }}>
              <span style={{ fontWeight: 600 }}>{p.province}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span>{p.jobs} emplois</span>
                <span style={{ color: "var(--text-soft)" }}>{p.atis} ATIs</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
