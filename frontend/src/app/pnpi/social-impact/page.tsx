import { backendRequest } from "@/lib/backend";
export const dynamic = "force-dynamic";

export default async function SocialImpactPage() {
  let data: any = null;
  try {
    const res = await backendRequest("/pnpi/dashboard/social-impact");
    if (res.ok) data = await res.json();
  } catch {}
  if (!data) return <div style={{ padding: 32 }}>Erreur de chargement.</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Impact social</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Retombees sociales de la politique industrielle sur les populations gabonaises.
      </p>

      {/* Hero KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Emplois total", value: (data.emplois_total ?? 0).toLocaleString("fr-FR"), color: "#006233", icon: "\u{1F477}" },
          { label: "Emplois femmes", value: `${(data.emplois_femmes ?? 0).toLocaleString("fr-FR")} (${data.pct_femmes ?? 0}%)`, color: "#ec4899", icon: "\u{1F469}" },
          { label: "Emplois jeunes", value: `${(data.emplois_jeunes ?? 0).toLocaleString("fr-FR")} (${data.pct_jeunes ?? 0}%)`, color: "#0c7eb4", icon: "\u{1F9D1}" },
          { label: "Provinces couvertes", value: `${data.provinces_couvertes ?? 0}/9`, color: "#7c3aed", icon: "\u{1F5FA}\uFE0F" },
        ].map(k => (
          <div key={k.label} className="chart-card" style={{ padding: "16px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Gender/Youth gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="chart-card" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Inclusion feminine</div>
          <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto" }}>
            <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f0f0f0" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ec4899" strokeWidth="3" strokeDasharray={`${data.pct_femmes}, 100`} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#ec4899" }}>
              {data.pct_femmes}%
            </div>
          </div>
        </div>
        <div className="chart-card" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Inclusion jeunes (&lt;35 ans)</div>
          <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto" }}>
            <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f0f0f0" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0c7eb4" strokeWidth="3" strokeDasharray={`${data.pct_jeunes}, 100`} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#0c7eb4" }}>
              {data.pct_jeunes}%
            </div>
          </div>
        </div>
      </div>

      {/* Province distribution */}
      <div className="chart-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Emplois par province</h3>
        {data.by_province.map((p: any) => {
          const max = Math.max(...data.by_province.map((x: any) => x.emplois), 1);
          return (
            <div key={p.province} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{p.province}</span>
              <div style={{ flex: 1, height: 10, borderRadius: 5, background: "var(--line)" }}>
                <div style={{ height: "100%", borderRadius: 5, background: "#006233", width: `${(p.emplois / max) * 100}%` }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 50, textAlign: "right" }}>{p.emplois}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
