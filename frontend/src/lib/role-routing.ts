export const hasRole = (roles: string[], role: string): boolean => roles.includes(role);

export const getDefaultRouteForRoles = (roles: string[]): string => {
  if (hasRole(roles, "admin")) return "/admin";
  if (hasRole(roles, "ministre")) return "/pnpi";
  if (hasRole(roles, "directeur")) return "/pnpi";
  if (hasRole(roles, "instructeur")) return "/pnpi";
  if (hasRole(roles, "operateur")) return "/pnpi/guichet";
  if (hasRole(roles, "inspecteur")) return "/inspecteur";
  return "/";
};

export interface NavLink {
  href: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Navigation config — define once, filter by role
// ---------------------------------------------------------------------------

interface NavEntry {
  href: string;
  label: string;
  roles: string[];  // which roles can see this link
}

const ALL_DECISION = ["admin", "ministre", "directeur"];
const ALL_PNPI = ["admin", "ministre", "directeur", "instructeur"];
const ALL_FIELD = ["admin", "ministre", "directeur", "instructeur", "inspecteur"];

const NAV_ENTRIES: NavEntry[] = [
  // Core PNPI
  { href: "/pnpi", label: "Dashboard PNPI", roles: ALL_PNPI },
  { href: "/pnpi/executive", label: "Synthese", roles: ALL_DECISION },
  { href: "/pnpi/live", label: "Temps reel", roles: ALL_DECISION },
  { href: "/pnpi/ati", label: "Agrements ATI", roles: ALL_FIELD },
  { href: "/pnpi/operateurs", label: "Operateurs", roles: [...ALL_FIELD, "operateur"] },
  { href: "/pnpi/inspections", label: "Inspections", roles: ["admin", "ministre", "directeur", "inspecteur"] },
  { href: "/pnpi/stats", label: "Statistiques", roles: ALL_FIELD },
  { href: "/pnpi/search", label: "Recherche", roles: ALL_FIELD },
  { href: "/pnpi/calendar", label: "Calendrier", roles: [...ALL_PNPI, "inspecteur"] },
  { href: "/pnpi/reports", label: "Rapports", roles: ALL_DECISION },
  { href: "/pnpi/map", label: "Carte", roles: ["admin", "ministre", "directeur", "inspecteur"] },

  // Dashboard & Analytics
  { href: "/pnpi/comparison", label: "Comparaison", roles: ALL_DECISION.concat("ministre") },
  { href: "/pnpi/impact", label: "Impact", roles: ALL_DECISION },
  { href: "/pnpi/heatmap", label: "Heatmap", roles: ["admin", "ministre", "directeur", "inspecteur"] },
  { href: "/pnpi/kanban", label: "Kanban", roles: [...ALL_PNPI, "inspecteur"] },
  { href: "/pnpi/data-quality", label: "Qualite", roles: ALL_DECISION },
  { href: "/pnpi/performance", label: "Performance", roles: ALL_DECISION },
  { href: "/pnpi/predictions", label: "Predictions", roles: ALL_DECISION },
  { href: "/pnpi/advanced-stats", label: "Stats+", roles: ALL_DECISION },
  { href: "/pnpi/annual-report", label: "Bilan annuel", roles: ALL_DECISION },
  { href: "/pnpi/benchmark", label: "Benchmark", roles: ALL_DECISION },
  { href: "/pnpi/pivot", label: "Tableau croise", roles: ALL_DECISION },
  { href: "/pnpi/smart-alerts", label: "Alertes IA", roles: ALL_DECISION },
  { href: "/pnpi/multi-year", label: "Multi-annees", roles: ALL_DECISION },
  { href: "/pnpi/economic-impact", label: "Impact eco.", roles: ALL_DECISION },
  { href: "/pnpi/realtime-stats", label: "Stats live", roles: ALL_DECISION },
  { href: "/pnpi/before-after", label: "Avant/Apres", roles: ALL_DECISION },

  // Operations
  { href: "/pnpi/mes-dossiers", label: "Mes Dossiers", roles: ["directeur", "instructeur"] },
  { href: "/pnpi/delegations", label: "Delegations", roles: ["admin", "directeur", "instructeur", "inspecteur"] },
  { href: "/pnpi/objectives", label: "Objectifs", roles: ["admin", "directeur", "instructeur", "inspecteur"] },
  { href: "/pnpi/renewals", label: "Renouvellements", roles: ["admin", "directeur", "instructeur", "operateur"] },
  { href: "/pnpi/triage", label: "Triage", roles: ["admin", "directeur", "instructeur"] },
  { href: "/pnpi/workflow-timing", label: "Timing", roles: ["admin", "directeur"] },
  { href: "/pnpi/certifications", label: "Certifications", roles: ["admin", "directeur", "instructeur", "operateur"] },
  { href: "/pnpi/email-alerts", label: "Alertes email", roles: ALL_PNPI },

  // Strategic
  { href: "/pnpi/conventions", label: "Conventions", roles: ALL_DECISION },
  { href: "/pnpi/odd", label: "ODD", roles: ALL_DECISION },
  { href: "/pnpi/cemac", label: "CEMAC", roles: ALL_DECISION },
  { href: "/pnpi/social-impact", label: "Impact social", roles: ALL_DECISION },
  { href: "/pnpi/roi-simulator", label: "Simulateur ROI", roles: [...ALL_DECISION, "operateur"] },
  { href: "/pnpi/carbon", label: "Carbone", roles: ALL_DECISION },
  { href: "/pnpi/roadmap", label: "Roadmap", roles: [...ALL_DECISION, "admin"] },
  { href: "/pnpi/budget", label: "Budget", roles: ALL_DECISION },
  { href: "/pnpi/governor", label: "Province", roles: ALL_DECISION },
  { href: "/pnpi/builder", label: "Mon dashboard", roles: ALL_DECISION },
  { href: "/pnpi/mobile", label: "Mobile", roles: ALL_PNPI },

  // Pilotage & Briefing
  { href: "/pilotage", label: "Pilotage", roles: ["admin", "ministre", "directeur"] },
  { href: "/briefing", label: "Briefing PNPI", roles: ["admin"] },
  { href: "/pnpi/briefing", label: "Briefing PNPI", roles: ["admin"] },
  { href: "/pnpi/presentation", label: "Presentation", roles: ALL_DECISION },
  { href: "/pnpi/activity", label: "Activite", roles: ["admin", "directeur"] },
  { href: "/kiosk", label: "Kiosque", roles: ["admin", "ministre"] },

  // Admin
  { href: "/admin", label: "Administration", roles: ["admin"] },
  { href: "/pnpi/dashboard-config", label: "Config Dashboard", roles: ALL_DECISION },
  { href: "/admin/audit-log", label: "Audit", roles: ["admin"] },
  { href: "/admin/workflows", label: "Workflows", roles: ["admin"] },
  { href: "/admin/orgchart", label: "Organigramme", roles: ["admin"] },
  { href: "/admin/raci", label: "RACI", roles: ["admin", "directeur"] },
  { href: "/admin/integrations", label: "Integrations", roles: ["admin"] },
  { href: "/admin/announcements", label: "Annonces", roles: ["admin"] },
  { href: "/admin/api-usage", label: "API Usage", roles: ["admin"] },
  { href: "/admin/scheduled-reports", label: "Rapports auto", roles: ["admin"] },
  { href: "/admin/security", label: "Securite", roles: ["admin"] },
  { href: "/admin/newsletter", label: "Newsletter", roles: ["admin"] },
  { href: "/api-docs", label: "API Docs", roles: ["admin"] },
  { href: "/embed", label: "Widgets", roles: ["admin"] },
  { href: "/changelog", label: "Changelog", roles: ["admin"] },

  // Operateur specific
  { href: "/pnpi/guichet", label: "Mon espace", roles: ["operateur"] },
  { href: "/pnpi/mentoring", label: "Parrainage", roles: ["instructeur", "operateur"] },

  // Inspecteur specific
  { href: "/inspecteur", label: "Mon espace", roles: ["inspecteur"] },
];

// Links visible to all authenticated users
const COMMON_LINKS: NavEntry[] = [
  { href: "/pnpi/success-stories", label: "Reussites", roles: [] },
  { href: "/pnpi/reglementation", label: "Reglementation", roles: [] },
  { href: "/pnpi/formation", label: "Formation", roles: [] },
  { href: "/pnpi/notes", label: "Notes", roles: [] },
  { href: "/pnpi/favorites", label: "Favoris", roles: [] },
  { href: "/pnpi/annuaire", label: "Annuaire", roles: [] },
  { href: "/pnpi/marketplace", label: "Marketplace", roles: [] },
  { href: "/pnpi/messages", label: "Messages", roles: [] },
  { href: "/profil", label: "Mon profil", roles: [] },
  { href: "/pnpi/polls", label: "Sondages", roles: [] },
  { href: "/pnpi/feedback", label: "Feedback", roles: [] },
  { href: "/aide", label: "Aide", roles: [] },
];

export const getNavLinksForRoles = (roles: string[]): NavLink[] => {
  if (!roles.length) return [{ href: "/connexion", label: "Connexion" }];

  const seen = new Set<string>();
  const links: NavLink[] = [];

  const add = (href: string, label: string) => {
    if (!seen.has(href)) {
      seen.add(href);
      links.push({ href, label });
    }
  };

  // Role-specific links
  for (const entry of NAV_ENTRIES) {
    if (entry.roles.some((r) => roles.includes(r))) {
      add(entry.href, entry.label);
    }
  }

  // Common links for all authenticated users
  if (links.length > 0) {
    for (const entry of COMMON_LINKS) {
      add(entry.href, entry.label);
    }
  }

  return links;
};
