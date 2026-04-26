export const metadata = {
  title: "Documentation API — PNPI",
  description:
    "Référence des endpoints publics et authentifiés de la Plateforme Nationale de Pilotage Industriel.",
};

export default function ApiDocsPage() {
  const endpoints = [
    {
      group: "Open Data (public, sans authentification)",
      color: "#009E60",
      items: [
        {
          method: "GET",
          path: "/open-data/stats",
          desc: "Statistiques agrégées anonymisées (totaux, répartitions, indicateurs)",
          auth: false,
        },
        {
          method: "GET",
          path: "/open-data/sectors",
          desc: "Volume d'ATI par secteur d'activité",
          auth: false,
        },
        {
          method: "GET",
          path: "/open-data/provinces",
          desc: "Volume d'opérateurs par province",
          auth: false,
        },
        {
          method: "GET",
          path: "/pnpi/ati/verify/{numero_ati}",
          desc: "Vérifier la validité d'un agrément ATI",
          auth: false,
        },
        { method: "GET", path: "/health/status", desc: "Statut opérationnel de la plateforme", auth: false },
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
  const METHOD_BG: Record<string, string> = {
    GET: "#dcfce7",
    POST: "#e0f2fe",
    PATCH: "#fef3c7",
    DELETE: "#fee2e2",
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", color: "#051B36" }}>
        Documentation API PNPI
      </h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
        Référence des endpoints publics et authentifiés de la Plateforme Nationale de Pilotage
        Industriel pour l&apos;intégration avec les systèmes partenaires (banques, douanes,
        registres, applications tierces).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <a
          href="/api/docs"
          style={{
            background: "#051B36",
            color: "#fff",
            padding: "14px 18px",
            borderRadius: 12,
            textDecoration: "none",
            display: "block",
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Interactif
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Swagger UI · /api/docs</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Test des endpoints en direct</div>
        </a>
        <a
          href="/api/redoc"
          style={{
            background: "#003DA5",
            color: "#fff",
            padding: "14px 18px",
            borderRadius: 12,
            textDecoration: "none",
            display: "block",
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Lecture
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>ReDoc · /api/redoc</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Référence imprimable détaillée</div>
        </a>
        <a
          href="/api/openapi.json"
          style={{
            background: "#009E60",
            color: "#fff",
            padding: "14px 18px",
            borderRadius: 12,
            textDecoration: "none",
            display: "block",
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Schéma
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>OpenAPI 3 · openapi.json</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Pour génération de SDK</div>
        </a>
      </div>

      <div
        style={{
          background: "#fff",
          padding: "20px 22px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          marginBottom: 22,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: "#051B36" }}>
          Démarrage rapide
        </h2>
        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
          <p style={{ marginBottom: 10 }}>
            <strong>1. Vérifier un agrément (sans authentification)</strong>
          </p>
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
              marginBottom: 14,
            }}
          >
{`curl https://pnpi.industrie.gouv.ga/pnpi/ati/verify/ATI-2026-00042`}
          </pre>

          <p style={{ marginBottom: 10 }}>
            <strong>2. Obtenir un Bearer token</strong>
          </p>
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
              marginBottom: 14,
            }}
          >
{`curl -X POST https://pnpi.industrie.gouv.ga/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username": "<utilisateur>", "password": "<mot_de_passe>"}'`}
          </pre>

          <p style={{ marginBottom: 10 }}>
            <strong>3. Appeler un endpoint authentifié</strong>
          </p>
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
              marginBottom: 4,
            }}
          >
{`curl https://pnpi.industrie.gouv.ga/pnpi/dashboard/kpis \\
  -H "Authorization: Bearer <access_token>"`}
          </pre>
        </div>
      </div>

      <div
        style={{
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          borderLeft: "4px solid #ea580c",
          padding: "14px 18px",
          borderRadius: 10,
          marginBottom: 22,
          fontSize: 13,
          color: "#7c2d12",
          lineHeight: 1.6,
        }}
      >
        <strong>Limites de débit :</strong> 60 requêtes/minute par IP sur les endpoints publics,
        120 requêtes/minute par utilisateur authentifié. Un dépassement renvoie un{" "}
        <code>HTTP 429 Too Many Requests</code> avec un en-tête <code>Retry-After</code>.
      </div>

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
                    background: METHOD_BG[ep.method] || "#f1f5f9",
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
