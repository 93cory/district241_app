export const dynamic = "force-dynamic";

export default async function OpenDataPage() {
  let kpis: any = {};
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/pnpi/dashboard/kpis`, { cache: "no-store" });
    if (res.ok) kpis = await res.json();
  } catch {}

  const datasets = [
    { name: "Operateurs industriels actifs", format: "GeoJSON", endpoint: "/geo/export.geojson", desc: "Liste georeferencee de tous les operateurs avec secteur et province.", auth: "JWT" },
    { name: "ATIs approuves (Excel)", format: "XLSX", endpoint: "/exports/atis.xlsx?statut=approuve", desc: "Registre des agrements techniques approuves.", auth: "JWT" },
    { name: "Operateurs (Excel)", format: "XLSX", endpoint: "/exports/operateurs.xlsx", desc: "Annuaire complet des operateurs industriels.", auth: "JWT" },
    { name: "Statistiques KPIs", format: "JSON", endpoint: "/pnpi/dashboard/kpis", desc: "Indicateurs cles en temps reel.", auth: "JWT" },
    { name: "Verification ATI", format: "JSON", endpoint: "/pnpi/ati/verify/{numero}", desc: "Verification publique d'un agrement par numero.", auth: "Public" },
    { name: "Statut systeme", format: "JSON", endpoint: "/health/status", desc: "Etat operationnel de la plateforme.", auth: "Public" },
    { name: "Archive annuelle", format: "JSON", endpoint: "/exports/create-archive", desc: "Archive scellee avec hash d'integrite SHA-256.", auth: "Admin" },
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Manrope, system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #051B36, #0C7EB4)", color: "#fff", padding: "50px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>Open Data PNPI</h1>
        <p style={{ fontSize: 15, opacity: 0.8, maxWidth: 600, margin: "0 auto" }}>
          Transparence et ouverture des donnees industrielles du Gabon.
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: "-20px auto 40px", padding: "0 24px" }}>
        {/* Live stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { label: "ATIs", value: kpis.atis_total || 0 },
            { label: "Operateurs", value: kpis.operateurs_actifs || 0 },
            { label: "Inspections", value: kpis.inspections_total || 0 },
            { label: "Approuves", value: kpis.atis_approuves || 0 },
          ].map(k => (
            <div key={k.label} style={{
              padding: "16px", borderRadius: 14, background: "#fff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)", textAlign: "center",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#006233" }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#526175" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Jeux de donnees disponibles</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {datasets.map(ds => (
            <div key={ds.name} style={{
              padding: "16px 20px", borderRadius: 14, background: "#fff",
              border: "1.5px solid #dce4ef",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{ds.name}</div>
                <div style={{ fontSize: 12, color: "#526175", marginTop: 2 }}>{ds.desc}</div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: ds.auth === "Public" ? "#dcfce7" : ds.auth === "Admin" ? "#fef2f2" : "#e0f2fe",
                color: ds.auth === "Public" ? "#006233" : ds.auth === "Admin" ? "#b42318" : "#0c7eb4",
              }}>{ds.auth}</span>
              <span style={{
                padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: "#f3f4f6", fontFamily: "monospace",
              }}>{ds.format}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 14, background: "#f4f8fb", fontSize: 13, color: "#526175" }}>
          <strong>Licence :</strong> Les donnees publiques de la PNPI sont disponibles sous licence <strong>Open Data Gabon</strong>.
          Les donnees personnelles et sensibles sont protegees conformement a la reglementation en vigueur.
          <br /><br />
          <strong>API :</strong> Documentation technique disponible a <a href="/api-docs" style={{ color: "#006233", fontWeight: 600 }}>/api-docs</a>.
          API GraphQL disponible a <code style={{ background: "#e5e7eb", padding: "1px 4px", borderRadius: 3 }}>/graphql</code>.
        </div>
      </div>

      <div style={{ background: "#051B36", color: "rgba(255,255,255,0.6)", padding: "16px", textAlign: "center", fontSize: 10 }}>
        Ministere de l&apos;Industrie et de la Transformation Locale — Republique Gabonaise — PNPI {new Date().getFullYear()}
      </div>
    </div>
  );
}
