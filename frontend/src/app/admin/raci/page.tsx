import Link from "next/link";
import { redirect } from "next/navigation";
import { backendRequest, fetchBackendProfile } from "../../../lib/backend";
import { RaciEditor } from "./RaciEditor";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "directeur", "ministre"]);

interface RaciData {
  roles: string[];
  stages: { stage: string; raci: Record<string, string> }[];
}

export default async function RACIPage() {
  let canEdit = false;
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) redirect("/connexion");
    canEdit = (profile.roles ?? []).includes("admin");
  } catch {
    redirect("/connexion");
  }

  let data: RaciData | null = null;
  try {
    const res = await backendRequest("/admin/raci", { cache: "no-store" });
    if (res.ok) data = (await res.json()) as RaciData;
  } catch {
    /* fallback vide */
  }

  if (!data) {
    return (
      <section className="section">
        <div className="chart-card">
          <Link href="/admin" className="pnpi-back-link">
            &larr; Administration
          </Link>
          <h2>Matrice RACI</h2>
          <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
            Impossible de charger la matrice.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="chart-card">
        <div className="pnpi-page-head">
          <div>
            <Link href="/admin" className="pnpi-back-link">
              &larr; Administration
            </Link>
            <h2>Matrice RACI</h2>
            <p className="pnpi-page-sub">
              Responsabilites par etape du processus ATI. <strong>R</strong> = Responsable &middot;{" "}
              <strong>A</strong> = Approbateur &middot; <strong>C</strong> = Consulte &middot;{" "}
              <strong>I</strong> = Informe
            </p>
          </div>
        </div>

        <RaciEditor initial={data} canEdit={canEdit} />
      </div>
    </section>
  );
}
