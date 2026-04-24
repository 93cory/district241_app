import Link from "next/link";
import { redirect } from "next/navigation";
import { backendRequest, fetchBackendProfile } from "../../../lib/backend";
import { ImpersonateForm } from "./ImpersonateForm";

export const dynamic = "force-dynamic";

interface UserRow {
  username: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

export default async function SimulateurPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).includes("admin")) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  let users: UserRow[] = [];
  let error = "";
  try {
    const res = await backendRequest("/admin/users", { cache: "no-store" });
    if (res.ok) users = (await res.json()) as UserRow[];
    else error = "Impossible de charger la liste des utilisateurs.";
  } catch {
    error = "Erreur de connexion au backend.";
  }

  return (
    <section className="section">
      <div className="chart-card">
        <div className="pnpi-page-head">
          <div>
            <Link href="/admin" className="pnpi-back-link">
              &larr; Administration
            </Link>
            <h2>Simulateur de role</h2>
            <p className="pnpi-page-sub">
              Visualisez la plateforme comme un autre utilisateur pour deboguer ou verifier
              l&apos;acces. Chaque simulation est <strong>tracee dans l&apos;audit</strong> et
              limitee a <strong>30 minutes</strong>.
            </p>
          </div>
        </div>

        {error && (
          <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="pnpi-form-alert pnpi-form-alert--info" role="status">
          <div>
            <strong>Comment ca marche</strong>
            <p style={{ margin: "0.25rem 0 0" }}>
              Vous conservez votre session admin en arriere-plan. Une banniere visible en haut de
              chaque page permet de revenir a votre identite reelle en un clic.
            </p>
          </div>
        </div>

        <ImpersonateForm users={users.filter((u) => u.is_active)} />
      </div>
    </section>
  );
}
