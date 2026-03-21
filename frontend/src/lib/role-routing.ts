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
    add("/pnpi/stats", "Statistiques PNPI");
    add("/pnpi/briefing", "Briefing PNPI");
    add("/admin", "Administration");
    add("/pilotage", "Pilotage PNPI");
    add("/briefing", "Briefing PNPI");
  }

  if (hasRole(roles, "ministre")) {
    add("/pnpi", "Dashboard Ministériel");
    add("/pnpi/ati", "Agréments ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/inspections", "Inspections");
    add("/pnpi/stats", "Statistiques");
    add("/pilotage", "Pilotage");
  }

  if (hasRole(roles, "directeur")) {
    add("/pnpi", "Dashboard PNPI");
    add("/pnpi/mes-dossiers", "Mes Dossiers");
    add("/pnpi/ati", "Agréments ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/inspections", "Inspections");
    add("/pnpi/stats", "Statistiques");
  }

  if (hasRole(roles, "instructeur")) {
    add("/pnpi", "Dashboard PNPI");
    add("/pnpi/mes-dossiers", "Mes Dossiers");
    add("/pnpi/ati", "File ATI");
    add("/pnpi/operateurs", "Opérateurs");
    add("/pnpi/stats", "Statistiques");
  }

  if (hasRole(roles, "operateur")) {
    add("/pnpi/guichet", "Mon espace");
    add("/pnpi/ati", "Mes ATI");
    add("/pnpi/operateurs", "Opérateurs");
  }

  if (hasRole(roles, "inspecteur")) {
    add("/inspecteur", "Mon espace");
    add("/pnpi/inspections", "Inspections");
    add("/pnpi/ati", "Dossiers ATI");
    add("/pnpi/operateurs", "Opérateurs");
  }

  if (links.length > 0) {
    add("/profil", "Mon profil");
  }

  if (!links.length) {
    add("/connexion", "Connexion");
  }

  return links;
};
