export const hasRole = (roles: string[], role: string): boolean => roles.includes(role);

export const getDefaultRouteForRoles = (roles: string[]): string => {
  if (hasRole(roles, "admin")) return "/admin";
  // PNPI roles
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

export const getNavLinksForRoles = (roles: string[]): NavLink[] => {
  const links: NavLink[] = [];

  const add = (href: string, label: string) => {
    if (!links.some((entry) => entry.href === href)) {
      links.push({ href, label });
    }
  };

  if (hasRole(roles, "admin")) {
    add("/pnpi", "Dashboard PNPI");
    add("/pnpi/executive", "Synthese");
    add("/pnpi/live", "Temps reel");
    add("/pnpi/stats", "Statistiques PNPI");
    add("/pnpi/briefing", "Briefing PNPI");
    add("/admin", "Administration");
    add("/pilotage", "Pilotage PNPI");
    add("/briefing", "Briefing PNPI");
    add("/pnpi/dashboard-config", "Config Dashboard");
    add("/pnpi/calendar", "Calendrier");
    add("/pnpi/reports", "Rapports");
    add("/pnpi/search", "Recherche");
    add("/pnpi/presentation", "Presentation");
    add("/pnpi/activity", "Activite");
    add("/admin/audit-log", "Audit");
    add("/admin/workflows", "Workflows");
    add("/pnpi/heatmap", "Heatmap");
    add("/pnpi/kanban", "Kanban");
    add("/pnpi/data-quality", "Qualite");
    add("/pnpi/performance", "Performance");
    add("/pnpi/predictions", "Predictions");
    add("/pnpi/delegations", "Delegations");
    add("/pnpi/advanced-stats", "Stats+");
    add("/admin/orgchart", "Organigramme");
    add("/admin/raci", "RACI");
    add("/changelog", "Changelog");
    add("/pnpi/annual-report", "Bilan annuel");
    add("/pnpi/objectives", "Objectifs");
    add("/pnpi/benchmark", "Benchmark");
    add("/pnpi/pivot", "Tableau croise");
    add("/pnpi/smart-alerts", "Alertes IA");
    add("/pnpi/multi-year", "Multi-annees");
    add("/pnpi/renewals", "Renouvellements");
    add("/pnpi/economic-impact", "Impact eco.");
    add("/admin/integrations", "Integrations");
    add("/admin/announcements", "Annonces");
    add("/admin/api-usage", "API Usage");
    add("/embed", "Widgets");
    add("/admin/scheduled-reports", "Rapports auto");
    add("/api-docs", "API Docs");
    add("/kiosk", "Kiosque");
    add("/pnpi/workflow-timing", "Timing");
    add("/pnpi/builder", "Mon dashboard");
  }

  if (hasRole(roles, "ministre")) {
    add("/pnpi", "Dashboard Ministériel");
    add("/pnpi/executive", "Synthese");
    add("/pnpi/live", "Temps reel");
    add("/pnpi/ati", "Agréments ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/inspections", "Inspections");
    add("/pnpi/stats", "Statistiques");
    add("/pnpi/comparison", "Comparaison");
    add("/pnpi/impact", "Impact");
    add("/pilotage", "Pilotage");
    add("/pnpi/search", "Recherche");
    add("/pnpi/presentation", "Presentation");
    add("/pnpi/dashboard-config", "Config Dashboard");
    add("/pnpi/calendar", "Calendrier");
    add("/pnpi/reports", "Rapports");
    add("/pnpi/heatmap", "Heatmap");
    add("/pnpi/kanban", "Kanban");
    add("/pnpi/data-quality", "Qualite");
    add("/pnpi/performance", "Performance");
    add("/pnpi/predictions", "Predictions");
    add("/pnpi/advanced-stats", "Stats+");
    add("/pnpi/annual-report", "Bilan annuel");
    add("/pnpi/benchmark", "Benchmark");
    add("/pnpi/pivot", "Tableau croise");
    add("/pnpi/smart-alerts", "Alertes IA");
    add("/pnpi/multi-year", "Multi-annees");
    add("/pnpi/economic-impact", "Impact eco.");
    add("/kiosk", "Kiosque");
    add("/pnpi/builder", "Mon dashboard");
  }

  if (hasRole(roles, "directeur")) {
    add("/pnpi", "Dashboard PNPI");
    add("/pnpi/executive", "Synthese");
    add("/pnpi/live", "Temps reel");
    add("/pnpi/mes-dossiers", "Mes Dossiers");
    add("/pnpi/ati", "Agréments ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/inspections", "Inspections");
    add("/pnpi/stats", "Statistiques");
    add("/pnpi/comparison", "Comparaison");
    add("/pnpi/impact", "Impact");
    add("/pnpi/search", "Recherche");
    add("/pnpi/presentation", "Presentation");
    add("/pnpi/activity", "Activite");
    add("/pnpi/dashboard-config", "Config Dashboard");
    add("/pnpi/calendar", "Calendrier");
    add("/pnpi/reports", "Rapports");
    add("/pnpi/heatmap", "Heatmap");
    add("/pnpi/kanban", "Kanban");
    add("/pnpi/data-quality", "Qualite");
    add("/pnpi/performance", "Performance");
    add("/pnpi/predictions", "Predictions");
    add("/pnpi/delegations", "Delegations");
    add("/pnpi/advanced-stats", "Stats+");
    add("/admin/raci", "RACI");
    add("/pnpi/annual-report", "Bilan annuel");
    add("/pnpi/objectives", "Objectifs");
    add("/pnpi/benchmark", "Benchmark");
    add("/pnpi/pivot", "Tableau croise");
    add("/pnpi/smart-alerts", "Alertes IA");
    add("/pnpi/multi-year", "Multi-annees");
    add("/pnpi/renewals", "Renouvellements");
    add("/pnpi/economic-impact", "Impact eco.");
    add("/pnpi/workflow-timing", "Timing");
    add("/pnpi/builder", "Mon dashboard");
  }

  if (hasRole(roles, "instructeur")) {
    add("/pnpi", "Dashboard PNPI");
    add("/pnpi/mes-dossiers", "Mes Dossiers");
    add("/pnpi/ati", "File ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/stats", "Statistiques");
    add("/pnpi/search", "Recherche");
    add("/pnpi/calendar", "Calendrier");
    add("/pnpi/kanban", "Kanban");
    add("/pnpi/delegations", "Delegations");
    add("/pnpi/objectives", "Objectifs");
    add("/pnpi/renewals", "Renouvellements");
  }

  if (hasRole(roles, "operateur")) {
    add("/pnpi/guichet", "Mon espace");
    add("/pnpi/ati", "Mes ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/renewals", "Renouvellements");
  }

  if (hasRole(roles, "inspecteur")) {
    add("/inspecteur", "Mon espace");
    add("/pnpi/inspections", "Inspections");
    add("/pnpi/ati", "Dossiers ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/heatmap", "Heatmap");
    add("/pnpi/calendar", "Calendrier");
    add("/pnpi/delegations", "Delegations");
    add("/pnpi/objectives", "Objectifs");
  }

  if (links.length > 0) {
    add("/pnpi/notes", "Notes");
    add("/pnpi/favorites", "Favoris");
    add("/pnpi/annuaire", "Annuaire");
    add("/pnpi/messages", "Messages");
    add("/profil", "Mon profil");
    add("/pnpi/polls", "Sondages");
    add("/pnpi/feedback", "Feedback");
    add("/aide", "Aide");
  }

  if (!links.length) {
    add("/connexion", "Connexion");
  }

  return links;
};
