import { redirect } from "next/navigation";

import { fetchBackendProfile } from "../../../../lib/backend";
import { getDefaultRouteForRoles } from "../../../../lib/role-routing";

const INSTITUTION_ROLES = new Set(["admin", "ministre", "directeur", "instructeur"]);
const MINISTER_ROLES = new Set(["admin", "ministre"]);

export async function requireInstitutionAccess(ministerOnly = false) {
  let profile: Awaited<ReturnType<typeof fetchBackendProfile>>;
  try {
    profile = await fetchBackendProfile();
  } catch {
    redirect("/connexion");
  }
  const allowed = ministerOnly ? MINISTER_ROLES : INSTITUTION_ROLES;
  if (!(profile.roles ?? []).some((role) => allowed.has(role))) {
    redirect(getDefaultRouteForRoles(profile.roles ?? []));
  }
  return profile;
}

export function canViewMinisterCockpit(roles: string[]) {
  return roles.some((role) => MINISTER_ROLES.has(role));
}
