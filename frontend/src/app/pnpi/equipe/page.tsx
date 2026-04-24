import Link from "next/link";
import { redirect } from "next/navigation";
import { backendRequest, fetchBackendProfile } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "directeur"]);

interface TeamMember {
  username: string;
  full_name: string;
  nb_actifs: number;
  nb_en_retard: number;
  decisions_mois: number;
  approuves_mois: number;
  taux_approbation_pct: number | null;
  charge_level: "ok" | "warning" | "critical";
}

const CHARGE_LABELS: Record<string, string> = {
  ok: "Normale",
  warning: "Chargee",
  critical: "Saturee",
};

export default async function TeamWorkloadPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  let team: TeamMember[] = [];
  let error = "";
  try {
    const res = await backendRequest("/pnpi/team/workload", { cache: "no-store" });
    if (res.ok) team = (await res.json()) as TeamMember[];
    else error = `Impossible de charger l'equipe (${res.status}).`;
  } catch {
    error = "Erreur de connexion au backend.";
  }

  const totalActifs = team.reduce((s, m) => s + m.nb_actifs, 0);
  const totalRetard = team.reduce((s, m) => s + m.nb_en_retard, 0);
  const satures = team.filter((m) => m.charge_level === "critical").length;

  return (
    <section className="section">
      <div className="chart-card">
        <div className="pnpi-page-head">
          <div>
            <Link href="/pnpi" className="pnpi-back-link">
              &larr; Tableau de bord
            </Link>
            <h2>Tableau d&apos;equipe</h2>
            <p className="pnpi-page-sub">
              {team.length} instructeur(s) &middot; {totalActifs} dossier(s) actif(s)
              {totalRetard > 0 && (
                <>
                  {" "}
                  &middot; <span className="pnpi-overdue-count">{totalRetard} en retard</span>
                </>
              )}
              {satures > 0 && (
                <>
                  {" "}
                  &middot; <strong style={{ color: "#B42318" }}>{satures} sature(s)</strong>
                </>
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
            {error}
          </div>
        )}

        {team.length === 0 ? (
          <div className="pnpi-empty">Aucun instructeur actif dans l&apos;equipe.</div>
        ) : (
          <div className="table-scroll">
            <table className="annex-table team-table">
              <thead>
                <tr>
                  <th>Instructeur</th>
                  <th>Charge</th>
                  <th className="num">Actifs</th>
                  <th className="num">En retard</th>
                  <th className="num">Decisions ce mois</th>
                  <th className="num">Taux approbation</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.username}>
                    <td>
                      <strong>{m.full_name}</strong>
                      <div className="team-member-username">{m.username}</div>
                    </td>
                    <td>
                      <span className={`pnpi-pill team-pill-${m.charge_level}`}>
                        {CHARGE_LABELS[m.charge_level]}
                      </span>
                    </td>
                    <td className="num">{m.nb_actifs}</td>
                    <td className="num">
                      {m.nb_en_retard > 0 ? (
                        <span style={{ color: "#B42318", fontWeight: 700 }}>{m.nb_en_retard}</span>
                      ) : (
                        <span style={{ color: "var(--gabon-green)" }}>0</span>
                      )}
                    </td>
                    <td className="num">
                      {m.decisions_mois} ({m.approuves_mois} OK)
                    </td>
                    <td className="num">
                      {m.taux_approbation_pct !== null ? `${m.taux_approbation_pct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
