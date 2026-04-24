export default function PlanDuSitePage() {
  const sections = [
    {
      title: "Pages publiques",
      links: [
        { href: "/", label: "Accueil" },
        { href: "/investors", label: "Investisseurs" },
        { href: "/open-data", label: "Open Data" },
        { href: "/contact", label: "Contact" },
        { href: "/status", label: "Statut systeme" },
        { href: "/status/history", label: "Historique disponibilite" },
        { href: "/connexion", label: "Connexion" },
        { href: "/verify/ati/[numero]", label: "Verification ATI" },
        { href: "/verify/product", label: "Verification produit" },
        { href: "/verify/operateur/[nif]", label: "Verification operateur" },
      ],
    },
    {
      title: "Tableaux de bord",
      links: [
        { href: "/pnpi", label: "Dashboard principal" },
        { href: "/pnpi/executive", label: "Synthese executive" },
        { href: "/pnpi/live", label: "Temps reel" },
        { href: "/pnpi/governor", label: "Dashboard provincial" },
        { href: "/pnpi/builder", label: "Dashboard personnalise" },
        { href: "/kiosk", label: "Mode kiosque" },
      ],
    },
    {
      title: "Agrements (ATI)",
      links: [
        { href: "/pnpi/ati", label: "Liste des ATI" },
        { href: "/pnpi/kanban", label: "Kanban pipeline" },
        { href: "/pnpi/guichet", label: "Guichet operateur" },
        { href: "/pnpi/renewals", label: "Renouvellements" },
        { href: "/pnpi/favorites", label: "Favoris" },
      ],
    },
    {
      title: "Operateurs & Inspections",
      links: [
        { href: "/pnpi/operateurs", label: "Operateurs" },
        { href: "/pnpi/inspections", label: "Inspections" },
        { href: "/pnpi/map", label: "Carte interactive" },
        { href: "/pnpi/certifications", label: "Certifications qualite" },
        { href: "/pnpi/mentoring", label: "Parrainage" },
        { href: "/pnpi/marketplace", label: "Marketplace" },
      ],
    },
    {
      title: "Analytics & Rapports",
      links: [
        { href: "/pnpi/stats", label: "Statistiques" },
        { href: "/pnpi/advanced-stats", label: "Stats avancees" },
        { href: "/pnpi/predictions", label: "Predictions" },
        { href: "/pnpi/comparison", label: "Comparaison periodique" },
        { href: "/pnpi/multi-year", label: "Multi-annees" },
        { href: "/pnpi/benchmark", label: "Benchmark provincial" },
        { href: "/pnpi/cemac", label: "Benchmark CEMAC" },
        { href: "/pnpi/reports", label: "Constructeur de rapports" },
        { href: "/pnpi/pivot", label: "Tableau croise" },
        { href: "/pnpi/annual-report", label: "Bilan annuel" },
        { href: "/pnpi/performance", label: "Performance instructeurs" },
        { href: "/pnpi/smart-alerts", label: "Alertes intelligentes" },
        { href: "/pnpi/workflow-timing", label: "Timing workflow" },
      ],
    },
    {
      title: "Impact & Strategie",
      links: [
        { href: "/pnpi/economic-impact", label: "Impact economique" },
        { href: "/pnpi/social-impact", label: "Impact social" },
        { href: "/pnpi/carbon", label: "Empreinte carbone" },
        { href: "/pnpi/odd", label: "ODD Nations Unies" },
        { href: "/pnpi/budget", label: "Suivi budgetaire" },
        { href: "/pnpi/roi-simulator", label: "Simulateur ROI" },
        { href: "/pnpi/conventions", label: "Conventions" },
        { href: "/pnpi/roadmap", label: "Feuille de route" },
        { href: "/pnpi/success-stories", label: "Reussites" },
      ],
    },
    {
      title: "Communication",
      links: [
        { href: "/pnpi/messages", label: "Messagerie" },
        { href: "/pnpi/calendar", label: "Calendrier" },
        { href: "/pnpi/annuaire", label: "Annuaire" },
        { href: "/pnpi/notes", label: "Notes" },
        { href: "/pnpi/polls", label: "Sondages" },
        { href: "/pnpi/feedback", label: "Feedback" },
        { href: "/pnpi/notifications", label: "Notifications" },
        { href: "/pnpi/activity", label: "Activite" },
      ],
    },
    {
      title: "Administration",
      links: [
        { href: "/admin", label: "Administration" },
        { href: "/admin/audit-log", label: "Journal d'audit" },
        { href: "/admin/workflows", label: "Workflows" },
        { href: "/admin/security", label: "Securite" },
        { href: "/admin/integrations", label: "Integrations" },
        { href: "/admin/api-usage", label: "Utilisation API" },
        { href: "/admin/newsletter", label: "Newsletter" },
        { href: "/admin/announcements", label: "Annonces" },
        { href: "/admin/scheduled-reports", label: "Rapports planifies" },
        { href: "/admin/orgchart", label: "Organigramme" },
        { href: "/admin/raci", label: "Matrice RACI" },
      ],
    },
    {
      title: "Utilisateur",
      links: [
        { href: "/profil", label: "Mon profil" },
        { href: "/pnpi/objectives", label: "Mes objectifs" },
        { href: "/pnpi/delegations", label: "Delegations" },
        { href: "/pnpi/formation", label: "Formation" },
        { href: "/pnpi/search", label: "Recherche" },
        { href: "/pnpi/presentation", label: "Mode presentation" },
        { href: "/pnpi/dashboard-config", label: "Config dashboard" },
        { href: "/pnpi/heatmap", label: "Heatmap" },
        { href: "/pnpi/data-quality", label: "Qualite donnees" },
        { href: "/pnpi/reglementation", label: "Reglementation" },
      ],
    },
    {
      title: "Legal & Technique",
      links: [
        { href: "/legal/cgu", label: "CGU" },
        { href: "/legal/confidentialite", label: "Confidentialite" },
        { href: "/legal/accessibilite", label: "Accessibilite" },
        { href: "/api-docs", label: "Documentation API" },
        { href: "/changelog", label: "Notes de version" },
        { href: "/embed", label: "Widgets embarquables" },
        { href: "/plan-du-site", label: "Plan du site" },
      ],
    },
  ];

  return (
    <div style={{ padding: "40px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Plan du site</h1>
      <p style={{ color: "#526175", fontSize: 13, marginBottom: 24 }}>
        PNPI · Toutes les pages de la plateforme
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {sections.map((s) => (
          <div key={s.title}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 8,
                color: "#006233",
                borderBottom: "2px solid #006233",
                paddingBottom: 4,
              }}
            >
              {s.title}
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {s.links.map((l) => (
                <li key={l.href} style={{ marginBottom: 4 }}>
                  <a
                    href={l.href}
                    style={{ fontSize: 13, color: "#0c2a4a", textDecoration: "none" }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: "#6b7280" }}>
        {sections.reduce((s, sec) => s + sec.links.length, 0)} pages repertoriees · PNPI{" "}
        {new Date().getFullYear()}
      </div>
    </div>
  );
}
