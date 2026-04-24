export default function ApiDocsPage() {
  const endpoints = [
    {
      group: "Verification publique",
      color: "#006233",
      items: [
        {
          method: "GET",
          path: "/pnpi/ati/verify/{numero_ati}",
          desc: "Verifier la validite d'un ATI (public, sans auth)",
          auth: false,
        },
        { method: "GET", path: "/health/status", desc: "Statut du systeme (public)", auth: false },
      ],
    },
    {
      group: "Integration externe",
      color: "#0c7eb4",
      items: [
        {
          method: "GET",
          path: "/integration/verify-operateur/{nif}",
          desc: "Verifier un operateur par NIF",
          auth: "API Key",
        },
        {
          method: "GET",
          path: "/integration/operateurs-actifs",
          desc: "Liste des operateurs actifs",
          auth: "API Key",
        },
        {
          method: "GET",
          path: "/integration/conformite/{nif}",
          desc: "Statut de conformite d'un operateur",
          auth: "API Key",
        },
      ],
    },
    {
      group: "Agrements (ATI)",
      color: "#051B36",
      items: [
        {
          method: "GET",
          path: "/pnpi/ati",
          desc: "Liste des ATIs avec pagination et filtres",
          auth: "JWT",
        },
        { method: "GET", path: "/pnpi/ati/{id}", desc: "Detail d'un ATI", auth: "JWT" },
        { method: "POST", path: "/pnpi/ati", desc: "Creer un nouvel ATI", auth: "JWT" },
        {
          method: "POST",
          path: "/pnpi/ati/{id}/transition",
          desc: "Changer le statut d'un ATI",
          auth: "JWT",
        },
        {
          method: "POST",
          path: "/pnpi/ati/{id}/renew",
          desc: "Renouveler un ATI expire",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/pnpi/ati/{id}/certificate.pdf",
          desc: "Telecharger le certificat PDF",
          auth: "JWT",
        },
      ],
    },
    {
      group: "Exports",
      color: "#7c3aed",
      items: [
        { method: "GET", path: "/exports/atis.xlsx", desc: "Export Excel des ATIs", auth: "JWT" },
        {
          method: "GET",
          path: "/exports/operateurs.xlsx",
          desc: "Export Excel des operateurs",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/exports/briefing.pptx",
          desc: "Export PowerPoint briefing executif",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/exports/batch-qr.pdf",
          desc: "PDF avec QR codes en lot",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/exports/ati/{id}/documents.zip",
          desc: "Archive ZIP des documents",
          auth: "JWT",
        },
        { method: "GET", path: "/geo/export.geojson", desc: "Export GeoJSON filtre", auth: "JWT" },
      ],
    },
    {
      group: "Dashboard & Analytics",
      color: "#d97706",
      items: [
        {
          method: "GET",
          path: "/pnpi/dashboard/kpis",
          desc: "KPIs du tableau de bord",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/pnpi/dashboard/predictions",
          desc: "Analyse predictive",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/pnpi/dashboard/province-benchmark",
          desc: "Benchmarking provincial",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/pnpi/dashboard/comparison",
          desc: "Comparaison periodique",
          auth: "JWT",
        },
        {
          method: "GET",
          path: "/pnpi/dashboard/annual-report/{year}",
          desc: "Bilan annuel",
          auth: "JWT",
        },
        { method: "GET", path: "/reports/builder", desc: "Constructeur de rapports", auth: "JWT" },
        { method: "GET", path: "/reports/pivot", desc: "Tableau croise dynamique", auth: "JWT" },
      ],
    },
    {
      group: "Webhooks",
      color: "#b42318",
      items: [
        {
          method: "POST",
          path: "/webhooks/register",
          desc: "Enregistrer un webhook",
          auth: "JWT (admin)",
        },
        { method: "GET", path: "/webhooks/list", desc: "Liste des webhooks", auth: "JWT (admin)" },
      ],
    },
  ];

  const METHOD_COLORS: Record<string, string> = {
    GET: "#006233",
    POST: "#0c7eb4",
    PATCH: "#d97706",
    DELETE: "#b42318",
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Documentation API</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 8px" }}>
        Reference des endpoints de la plateforme PNPI pour l&apos;integration avec les systemes
        partenaires.
      </p>
      <p style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)", margin: "0 0 24px" }}>
        Documentation interactive complete disponible a{" "}
        <a href="/api/docs" style={{ color: "var(--accent, #006233)" }}>
          /api/docs
        </a>{" "}
        (Swagger UI)
      </p>

      {endpoints.map((group) => (
        <div key={group.group} style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: group.color,
              paddingBottom: 6,
              borderBottom: `2px solid ${group.color}`,
              marginBottom: 10,
            }}
          >
            {group.group}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {group.items.map((ep, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--bg-layer, #fff)",
                  border: "1px solid var(--line, #dce4ef)",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    background: `${METHOD_COLORS[ep.method] || "#526175"}12`,
                    color: METHOD_COLORS[ep.method] || "#526175",
                    fontFamily: "monospace",
                    minWidth: 40,
                    textAlign: "center",
                  }}
                >
                  {ep.method}
                </span>
                <code style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
                  {ep.path}
                </code>
                <span style={{ flex: 1, fontSize: 12, color: "var(--text-soft, #526175)" }}>
                  {ep.desc}
                </span>
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 600,
                    background:
                      ep.auth === false ? "#dcfce7" : ep.auth === "API Key" ? "#fef3c7" : "#e0f2fe",
                    color:
                      ep.auth === false ? "#006233" : ep.auth === "API Key" ? "#d97706" : "#0c7eb4",
                  }}
                >
                  {ep.auth === false ? "Public" : ep.auth}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
