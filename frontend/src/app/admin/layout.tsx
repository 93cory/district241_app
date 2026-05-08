import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { fetchBackendProfile } from "../../lib/backend";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let profile;
  try {
    profile = await fetchBackendProfile();
  } catch {
    redirect("/connexion");
  }
  if (!(profile.roles ?? []).includes("admin")) {
    redirect("/pilotage");
  }
  return <>{children}</>;
}
