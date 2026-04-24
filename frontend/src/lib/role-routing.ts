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
// Navigation config · define once, filter by role
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
  { href: "/pnpi/mes-stats", label: "Mes Statistiques", roles: ["directeur", "instructeur", "inspecteur"] },
  { href: "/pnpi/equipe", label: "Tableau d'equipe", roles: ["admin", "directeur"] },
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
  { href: "/admin/simulateur", label: "Simulateur de role", roles: ["admin"] },
  { href: "/admin/backups", label: "Sauvegardes BD", roles: ["admin"] },
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

// ---------------------------------------------------------------------------
// Mega-nav · Navigation hierarchisee en 5 sections
// Les liens sont filtres par role grace a l'index des liens visibles
// ---------------------------------------------------------------------------

export interface MegaGroup {
  title: string;
  items: NavLink[];
}

export interface MegaSection {
  key: string;
  label: string;
  href: string; // lien d'entree par defaut (clic sur le label)
  description: string;
  icon: string; // cle d'icone SVG (resolue dans MegaNav)
  groups: MegaGroup[];
}

export interface MegaNavData {
  sections: MegaSection[];
  tools: NavLink[];           // outils transversaux (recherche, annuaire...)
  quickAccess: NavLink[];     // "Mon espace" selon role
}

/**
 * Construit la navigation mega-menu pour les roles donnes.
 * Chaque section est conservee si au moins un lien reste visible apres filtrage.
 */
export const getMegaNavForRoles = (roles: string[]): MegaNavData => {
  if (!roles.length) {
    return {
      sections: [],
      tools: [],
      quickAccess: [{ href: "/connexion", label: "Connexion" }],
    };
  }

  // Index des hrefs autorises pour ce role
  const permitted = new Set<string>();
  for (const entry of NAV_ENTRIES) {
    if (entry.roles.some((r) => roles.includes(r))) {
      permitted.add(entry.href);
    }
  }
  for (const entry of COMMON_LINKS) {
    permitted.add(entry.href);
  }

  // Helper : filtre une liste de hrefs selon les permissions
  const pick = (refs: Array<[string, string]>): NavLink[] =>
    refs
      .filter(([href]) => permitted.has(href))
      .map(([href, label]) => ({ href, label }));

  const filterGroups = (groups: MegaGroup[]): MegaGroup[] =>
    groups
      .map((g) => ({ ...g, items: g.items.filter((it) => permitted.has(it.href)) }))
      .filter((g) => g.items.length > 0);

  const sections: MegaSection[] = [
    {
      key: "dashboard",
      label: "Tableau de bord",
      href: "/pnpi",
      description: "Pilotage ministeriel, indicateurs temps reel et synthese executive.",
      icon: "dashboard",
      groups: filterGroups([
        {
          title: "Vues d'ensemble",
          items: pick([
            ["/pnpi", "Dashboard PNPI"],
            ["/pnpi/executive", "Synthese executive"],
            ["/pnpi/live", "Temps reel"],
            ["/pnpi/realtime-stats", "Statistiques live"],
          ]),
        },
        {
          title: "Briefing & Pilotage",
          items: pick([
            ["/briefing", "Briefing PNPI"],
            ["/pilotage", "Salle de pilotage"],
            ["/pnpi/presentation", "Mode presentation"],
            ["/kiosk", "Mode kiosque"],
          ]),
        },
        {
          title: "Personnalisation",
          items: pick([
            ["/pnpi/builder", "Mon dashboard"],
            ["/pnpi/dashboard-config", "Configuration"],
            ["/pnpi/favorites", "Favoris"],
          ]),
        },
      ]),
    },
    {
      key: "agrements",
      label: "Agrements",
      href: "/pnpi/ati",
      description: "Instruction des ATI, suivi des operateurs et gestion des dossiers.",
      icon: "seal",
      groups: filterGroups([
        {
          title: "Dossiers",
          items: pick([
            ["/pnpi/ati", "Agrements techniques"],
            ["/pnpi/operateurs", "Operateurs"],
            ["/pnpi/mes-dossiers", "Mes dossiers"],
            ["/pnpi/mes-stats", "Mes statistiques"],
            ["/pnpi/triage", "Triage"],
            ["/pnpi/kanban", "Kanban"],
          ]),
        },
        {
          title: "Gestion du cycle",
          items: pick([
            ["/pnpi/equipe", "Tableau d'equipe"],
            ["/pnpi/delegations", "Delegations"],
            ["/pnpi/renewals", "Renouvellements"],
            ["/pnpi/certifications", "Certifications"],
            ["/pnpi/workflow-timing", "Timing workflow"],
            ["/pnpi/email-alerts", "Alertes email"],
            ["/pnpi/objectives", "Objectifs"],
          ]),
        },
        {
          title: "Cadre & Qualite",
          items: pick([
            ["/pnpi/conventions", "Conventions"],
            ["/pnpi/reglementation", "Reglementation"],
            ["/pnpi/data-quality", "Qualite donnees"],
          ]),
        },
      ]),
    },
    {
      key: "terrain",
      label: "Terrain",
      href: "/pnpi/inspections",
      description: "Inspections, cartographie, couverture provinciale et mobilite.",
      icon: "map",
      groups: filterGroups([
        {
          title: "Inspections",
          items: pick([
            ["/pnpi/inspections", "Inspections"],
            ["/pnpi/calendar", "Calendrier"],
          ]),
        },
        {
          title: "Geographie",
          items: pick([
            ["/pnpi/map", "Carte nationale"],
            ["/pnpi/heatmap", "Heatmap"],
            ["/pnpi/governor", "Par province"],
          ]),
        },
        {
          title: "Mobilite",
          items: pick([
            ["/pnpi/mobile", "Terrain mobile"],
          ]),
        },
      ]),
    },
    {
      key: "analyses",
      label: "Analyses",
      href: "/pnpi/stats",
      description: "Rapports, indicateurs d'impact et aide a la decision strategique.",
      icon: "chart",
      groups: filterGroups([
        {
          title: "Rapports & Statistiques",
          items: pick([
            ["/pnpi/stats", "Statistiques"],
            ["/pnpi/advanced-stats", "Statistiques avancees"],
            ["/pnpi/pivot", "Tableau croise"],
            ["/pnpi/reports", "Rapports"],
            ["/pnpi/annual-report", "Bilan annuel"],
            ["/pnpi/performance", "Performance"],
          ]),
        },
        {
          title: "Comparaisons & Predictions",
          items: pick([
            ["/pnpi/comparison", "Comparaisons"],
            ["/pnpi/multi-year", "Multi-annees"],
            ["/pnpi/before-after", "Avant / Apres"],
            ["/pnpi/benchmark", "Benchmark"],
            ["/pnpi/predictions", "Predictions"],
            ["/pnpi/smart-alerts", "Alertes IA"],
          ]),
        },
        {
          title: "Impact & Strategie",
          items: pick([
            ["/pnpi/impact", "Impact global"],
            ["/pnpi/economic-impact", "Impact economique"],
            ["/pnpi/social-impact", "Impact social"],
            ["/pnpi/carbon", "Empreinte carbone"],
            ["/pnpi/odd", "Objectifs ODD"],
            ["/pnpi/cemac", "CEMAC"],
            ["/pnpi/budget", "Budget"],
            ["/pnpi/roi-simulator", "Simulateur ROI"],
            ["/pnpi/roadmap", "Feuille de route"],
          ]),
        },
      ]),
    },
    {
      key: "admin",
      label: "Administration",
      href: "/admin",
      description: "Gouvernance, securite, integrations et supervision technique.",
      icon: "gear",
      groups: filterGroups([
        {
          title: "Gouvernance",
          items: pick([
            ["/admin", "Tableau admin"],
            ["/admin/simulateur", "Simulateur de role"],
            ["/admin/orgchart", "Organigramme"],
            ["/admin/raci", "Matrice RACI"],
            ["/admin/workflows", "Workflows"],
            ["/pnpi/activity", "Activite"],
          ]),
        },
        {
          title: "Securite & Audit",
          items: pick([
            ["/admin/security", "Securite"],
            ["/admin/audit-log", "Journal d'audit"],
            ["/admin/backups", "Sauvegardes BD"],
          ]),
        },
        {
          title: "Integrations & Technique",
          items: pick([
            ["/admin/integrations", "Integrations"],
            ["/admin/api-usage", "Usage API"],
            ["/api-docs", "Documentation API"],
            ["/embed", "Widgets"],
            ["/changelog", "Historique versions"],
          ]),
        },
        {
          title: "Communication",
          items: pick([
            ["/admin/announcements", "Annonces"],
            ["/admin/newsletter", "Newsletter"],
            ["/admin/scheduled-reports", "Rapports planifies"],
          ]),
        },
      ]),
    },
  ].filter((s) => s.groups.length > 0);

  const tools: NavLink[] = pick([
    ["/pnpi/search", "Recherche"],
    ["/pnpi/annuaire", "Annuaire"],
    ["/pnpi/messages", "Messages"],
    ["/pnpi/notes", "Notes"],
    ["/pnpi/success-stories", "Reussites"],
    ["/pnpi/formation", "Formation"],
    ["/pnpi/marketplace", "Marketplace"],
    ["/pnpi/mentoring", "Parrainage"],
    ["/pnpi/polls", "Sondages"],
    ["/pnpi/feedback", "Feedback"],
    ["/aide", "Aide"],
  ]);

  const quickAccess: NavLink[] = pick([
    ["/pnpi/guichet", "Mon guichet"],
    ["/inspecteur", "Mes inspections"],
    ["/profil", "Mon profil"],
  ]);

  return { sections, tools, quickAccess };
};
