export const hasRole = (roles: string[], role: string): boolean => roles.includes(role);

export const getDefaultRouteForRoles = (roles: string[]): string => {
  if (hasRole(roles, "admin")) return "/admin";
  // PNPI roles
  if (hasRole(roles, "ministre")) return "/pnpi";
  if (hasRole(roles, "directeur")) return "/pnpi";
  if (hasRole(roles, "instructeur")) return "/pnpi";
  if (hasRole(roles, "operateur")) return "/pnpi/guichet";
  if (hasRole(roles, "inspecteur")) return "/inspecteur";
  // Legacy PNPI
  if (hasRole(roles, "ministere")) return "/pilotage";
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
    add("/pnpi/stats", "Statistiques PNPI");
    add("/pnpi/briefing", "Briefing PNPI");
  }

  if (hasRole(roles, "directeur")) {
    add("/pnpi", "Dashboard PNPI");
    add("/pnpi/ati", "Agréments ATI");
    add("/pnpi/stats", "Statistiques PNPI");
    add("/pnpi/briefing", "Briefing PNPI");
  }

  if (hasRole(roles, "instructeur")) {
    add("/pnpi", "Dashboard PNPI");
    add("/pnpi/ati", "File ATI");
    add("/pnpi/stats", "Statistiques PNPI");
  }

  if (hasRole(roles, "operateur")) {
    add("/pnpi/guichet", "Mon espace");
  }

  // Legacy PNPI roles
  if (hasRole(roles, "ministere")) {
    add("/pilotage", "Pilotage industriel");
    add("/briefing", "Briefing");
    add("/", "Tableau de bord");
  }

  if (hasRole(roles, "inspecteur")) {
    add("/inspecteur", "Mon espace");
    add("/pnpi/inspections", "Inspections");
    add("/pnpi/ati", "Dossiers ATI");
  }

  if (hasRole(roles, "industriel")) {
    add("/", "Tableau de bord");
    add("/briefing", "Briefing");
  }

  if (links.length > 0) {
    add("/profil", "Mon profil");
  }

  if (!links.length) {
    add("/connexion", "Connexion");
  }

  return links;
};
