export default function ChangelogPage() {
  const releases = [
    {
      version: "1.17.0",
      date: "22 mars 2026",
      tag: "latest",
      changes: [
        { type: "feat", text: "Historique de connexion avec detection IP/appareil" },
        { type: "feat", text: "Dashboard inspecteur dedie avec KPIs et actions rapides" },
        { type: "feat", text: "Templates email brandes (ATI approuve/rejete, SLA, briefing)" },
        { type: "feat", text: "Centre d'aide integre avec 22 FAQ" },
      ],
    },
    {
      version: "1.16.0",
      date: "22 mars 2026",
      changes: [
        { type: "feat", text: "Messagerie interne operateur ↔ instructeur" },
        { type: "feat", text: "Vue calendrier avec ATI + inspections + SLA" },
        { type: "feat", text: "Constructeur de rapports personnalises avec export CSV" },
        { type: "feat", text: "Journal d'audit admin avec recherche et export" },
      ],
    },
    {
      version: "1.15.0",
      date: "22 mars 2026",
      changes: [
        { type: "feat", text: "PWA avec Service Worker pour usage offline" },
        { type: "feat", text: "Monitoring Prometheus + dashboard Grafana" },
        { type: "feat", text: "Multi-tenant par province" },
        { type: "test", text: "4 nouvelles suites E2E Playwright" },
      ],
    },
    {
      version: "1.14.0",
      date: "22 mars 2026",
      changes: [
        { type: "feat", text: "Page de verification publique ATI (QR code)" },
        { type: "feat", text: "Rapport d'inspection PDF officiel" },
        { type: "feat", text: "Authentification biometrique (fingerprint / Face ID)" },
        { type: "feat", text: "API d'integration externe (douanes, impots, emploi)" },
      ],
    },
    {
      version: "1.13.0",
      date: "22 mars 2026",
      changes: [
        { type: "feat", text: "Import CSV operateurs (admin bulk)" },
        { type: "feat", text: "Deep links mobile (pnpi://ati/..., notification, inspection)" },
        { type: "feat", text: "Dashboard configurable (drag-and-drop widgets)" },
        { type: "feat", text: "Backup automatise S3/MinIO avec retention" },
      ],
    },
    {
      version: "1.12.0",
      date: "22 mars 2026",
      changes: [
        { type: "feat", text: "Scoring conformite operateur (composite 0-100, grades A-E)" },
        { type: "feat", text: "Certificat ATI officiel PDF avec QR code" },
        { type: "feat", text: "Comparaison periodique (trimestre vs trimestre)" },
        { type: "feat", text: "Preferences de notification par utilisateur" },
        { type: "feat", text: "Taches planifiees cron (rapport hebdo, SLA check, cleanup)" },
        { type: "feat", text: "Export ZIP documents par ATI" },
      ],
    },
    {
      version: "1.7.0",
      date: "22 mars 2026",
      changes: [
        { type: "feat", text: "Dark mode (Flutter + CSS prefers-color-scheme)" },
        { type: "feat", text: "Systeme de toasts (overlay anime)" },
        { type: "feat", text: "Skeleton loaders shimmer" },
        { type: "feat", text: "Dialogues de confirmation" },
        { type: "feat", text: "Validation champ par champ animee" },
        { type: "feat", text: "Menu hamburger responsive" },
        { type: "feat", text: "Layout tablet split-view" },
        { type: "feat", text: "Labels d'accessibilite ARIA" },
        { type: "feat", text: "Indicateur offline" },
        { type: "feat", text: "Session timeout avec warning" },
        { type: "infra", text: "2FA TOTP + codes de secours" },
        { type: "infra", text: "PostGIS integration" },
        { type: "infra", text: "Docker production + CI/CD GitHub Actions" },
        { type: "test", text: "Tests backend pytest + Flutter widget + Playwright E2E" },
      ],
    },
  ];

  const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    feat: { bg: "#dcfce7", color: "#166534", label: "Feature" },
    fix: { bg: "#fef2f2", color: "#b42318", label: "Fix" },
    infra: { bg: "#e0f2fe", color: "#0c7eb4", label: "Infra" },
    test: { bg: "#f3e8ff", color: "#7c3aed", label: "Test" },
    docs: { bg: "#fef3c7", color: "#92400e", label: "Docs" },
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Notes de version</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 28px" }}>
        Historique des evolutions de la Plateforme Nationale de la Politique Industrielle.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {releases.map((release) => (
          <div key={release.version} style={{
            borderRadius: 16, border: "1.5px solid var(--line, #dce4ef)",
            background: "var(--bg-layer, #fff)", overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px",
              background: release.tag === "latest" ? "linear-gradient(135deg, #006233, #0c7eb4)" : "var(--bg-base, #f4f8fb)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 18, fontWeight: 800,
                  color: release.tag === "latest" ? "#fff" : "var(--text-main, #0c2a4a)",
                }}>
                  v{release.version}
                </span>
                {release.tag === "latest" && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: "rgba(255, 255, 255, 0.72)", color: "#fff",
                  }}>
                    LATEST
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 12,
                color: release.tag === "latest" ? "rgba(255,255,255,0.8)" : "var(--text-soft, #526175)",
              }}>
                {release.date}
              </span>
            </div>
            <div style={{ padding: "14px 20px" }}>
              {release.changes.map((change, i) => {
                const style = TYPE_STYLES[change.type] || TYPE_STYLES.feat;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: style.bg, color: style.color, whiteSpace: "nowrap", marginTop: 2,
                    }}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: 13, lineHeight: 1.5 }}>{change.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
