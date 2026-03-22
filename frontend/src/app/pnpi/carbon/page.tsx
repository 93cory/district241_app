import { backendRequest } from "@/lib/backend";
export const dynamic = "force-dynamic";

const SECTOR_EMISSIONS: Record<string, { co2_per_ati: number; label: string; color: string }> = {
  mines: { co2_per_ati: 8500, label: "Mines", color: "#b42318" },
  btp: { co2_per_ati: 4200, label: "BTP", color: "#e65100" },
  chimie: { co2_per_ati: 3800, label: "Chimie", color: "#d97706" },
  energie: { co2_per_ati: 2500, label: "Energie", color: "#f2b800" },
  bois: { co2_per_ati: 1200, label: "Bois", color: "#059669" },
  agroalimentaire: { co2_per_ati: 900, label: "Agroalimentaire", color: "#006233" },
  peche: { co2_per_ati: 600, label: "Peche", color: "#0c7eb4" },
};

export default async function CarbonPage() {
  let kpis: any = {};
  try {
    const res = await backendRequest("/pnpi/dashboard/kpis");
    if (res.ok) kpis = await res.json();
  } catch {}

  // Estimate carbon from sectors
  const sectors = kpis.secteurs || [];
  let totalCO2 = 0;
  const sectorData = sectors.map((s: any) => {
    const emData = SECTOR_EMISSIONS[s.secteur] || { co2_per_ati: 500, label: s.secteur, color: "#526175" };
    const co2 = s.count * emData.co2_per_ati;
    totalCO2 += co2;
    return { ...emData, secteur: s.secteur, count: s.count, co2 };
  }).sort((a: any, b: any) => b.co2 - a.co2);

  const totalTonnes = Math.round(totalCO2 / 1000);
  const compensationArbres = Math.round(totalCO2 / 22); // ~22kg CO2/arbre/an

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Empreinte carbone industrielle</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Estimation des emissions CO2 liees aux activites industrielles agreees.
      </p>

      {/* Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <div className="chart-card" style={{ padding: "18px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>{"\uD83C\uDF0D"}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#b42318" }}>{totalTonnes.toLocaleString("fr-FR")} t</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>CO2 estime (tonnes/an)</div>
        </div>
        <div className="chart-card" style={{ padding: "18px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>{"\uD83C\uDF32"}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#006233" }}>{compensationArbres.toLocaleString("fr-FR")}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>Arbres pour compenser</div>
        </div>
        <div className="chart-card" style={{ padding: "18px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>{"\uD83D\uDCCA"}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0c7eb4" }}>{sectorData.length}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>Secteurs mesures</div>
        </div>
      </div>

      {/* Sector breakdown */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Emissions par secteur</h3>
        {sectorData.map((s: any) => {
          const maxCO2 = Math.max(...sectorData.map((x: any) => x.co2), 1);
          const pct = (s.co2 / maxCO2) * 100;
          return (
            <div key={s.secteur} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{s.label} ({s.count} ATIs)</span>
                <span style={{ fontWeight: 700, color: s.color }}>{(s.co2 / 1000).toFixed(1)} tonnes</span>
              </div>
              <div style={{ height: 10, borderRadius: 5, background: "var(--line)" }}>
                <div style={{ height: "100%", borderRadius: 5, background: s.color, width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      <div className="chart-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: "#006233" }}>Recommandations</h3>
        {[
          { icon: "\uD83C\uDF3F", text: "Privilegier les certifications ISO 14001 pour le management environnemental" },
          { icon: "\u26A1", text: "Encourager la transition vers les energies renouvelables dans le secteur minier" },
          { icon: "\uD83C\uDF32", text: `Planter ${compensationArbres.toLocaleString("fr-FR")} arbres pour atteindre la neutralite carbone` },
          { icon: "\uD83D\uDCC9", text: "Fixer des objectifs de reduction de 20% sur 5 ans par secteur" },
          { icon: "\uD83C\uDFED", text: "Inciter les operateurs a adopter des technologies propres via des avantages ATI" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--line, #eee)", fontSize: 13 }}>
            <span>{r.icon}</span>
            <span>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
