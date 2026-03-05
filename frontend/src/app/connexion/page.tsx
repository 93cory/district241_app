import { redirect } from "next/navigation";

import { fetchBackendProfile } from "../../lib/backend";
import { getDefaultRouteForRoles } from "../../lib/role-routing";
import { ConnexionForm } from "./ConnexionForm";

export default async function ConnexionPage() {
  try {
    const profile = await fetchBackendProfile();
    redirect(getDefaultRouteForRoles(profile.roles ?? []));
  } catch {
    // not authenticated: render login form
  }

  return <ConnexionForm />;
}
