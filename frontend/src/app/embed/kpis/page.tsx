export const dynamic = "force-dynamic";

export default async function EmbedKpisPage() {
  let kpis: any = {};
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/pnpi/dashboard/kpis`, { cache: "no-store" });
    if (res.ok) kpis = await res.json();
  } catch {}

  const cards = [
    { label: "ATIs", value: kpis.atis_total || 0, color: "#051B36" },
    { label: "Approuves", value: kpis.atis_approuves || 0, color: "#006233" },
    { label: "Operateurs", value: kpis.operateurs_actifs || 0, color: "#0c7eb4" },
    { label: "Inspections", value: kpis.inspections_total || 0, color: "#7c3aed" },
  ];

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Manrope, system-ui, sans-serif", background: "transparent" }}>
        <div style={{ display: "flex", gap: 10, padding: 8 }}>
          {cards.map(c => (
            <div key={c.label} style={{
              flex: 1, padding: "12px 14px", borderRadius: 12,
              background: "#fff", border: `1.5px solid ${c.color}20`,
              textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#526175" }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#9ca3af", padding: "4px 0" }}>
          PNPI — pnpi-gabon.ga
        </div>
      </body>
    </html>
  );
}
