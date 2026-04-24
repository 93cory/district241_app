import Link from "next/link";
import { redirect } from "next/navigation";
import { backendRequest, fetchBackendProfile } from "../../../lib/backend";
import { KpiCard } from "../../components/KpiCard";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "directeur", "instructeur", "inspecteur"]);

interface RecentActivity {
  ati_id: string;
  numero_ati: string;
  action: string;
  note: string;
  changed_at: string;
}

interface MyStats {
  username: string;
  roles: string[];
  total_transitions: number;
  this_month_transitions: number;
  last_30d_transitions: number;
  decisions: number;
  approuves: number;
  rejetes: number;
  taux_approbation_pct: number;
  delai_moyen_jours: number;
  taux_sla_perso_pct: number;
  atis_assignes_actifs: number;
  atis_assignes_en_retard: number;
  activite_recente: RecentActivity[];
}

export default async function MesStatsPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) {
      redirect("/connexion");
    }
  } catch {
    redirect("/connexion");
  }

  let stats: MyStats | null = null;
  let error = "";
  try {
    const res = await backendRequest("/pnpi/me/stats", { cache: "no-store" });
    if (res.ok) stats = (await res.json()) as MyStats;
    else error = `Impossible de charger vos statistiques (${res.status}).`;
  } catch {
    error = "Erreur de connexion au backend.";
  }

  if (!stats) {
    return (
      <section className="section">
        <div className="chart-card">
          <Link href="/pnpi" className="pnpi-back-link">
            &larr; Tableau de bord
          </Link>
          <h2 style={{ marginTop: "0.5rem" }}>Mes statistiques</h2>
          <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
            {error || "Aucune donnee disponible."}
          </div>
        </div>
      </section>
    );
  }

  const slaTone: "good" | "warn" | "alert" =
    stats.taux_sla_perso_pct >= 85 ? "good" : stats.taux_sla_perso_pct >= 70 ? "warn" : "alert";

  return (
    <section className="section">
      <div className="chart-card">
        <div className="pnpi-page-head">
          <div>
            <Link href="/pnpi" className="pnpi-back-link">
              &larr; Tableau de bord
            </Link>
            <h2>Mes statistiques</h2>
            <p className="pnpi-page-sub">
              Votre bilan personnel &middot; utilisateur : <strong>{stats.username}</strong> (
              {stats.roles.join(", ")})
            </p>
          </div>
        </div>

        {/* KPIs cle */}
        <div className="hero-grid" style={{ marginBottom: "1.5rem" }}>
          <KpiCard
            tone="primary"
            label="Dossiers traites ce mois"
            value={stats.this_month_transitions}
            sublabel={`${stats.last_30d_transitions} sur les 30 derniers jours`}
          />
          <KpiCard
            tone="success"
            label="Taux d'approbation"
            value={`${stats.taux_approbation_pct}%`}
            sublabel={`${stats.approuves} approuves / ${stats.rejetes} rejetes`}
          />
          <KpiCard
            tone="neutral"
            label="Delai moyen decision"
            value={`${stats.delai_moyen_jours.toFixed(1)} j`}
            sublabel="Du depot a la decision finale"
          />
          <KpiCard
            tone={slaTone === "good" ? "success" : slaTone === "warn" ? "accent" : "neutral"}
            label="Respect SLA perso"
            value={`${stats.taux_sla_perso_pct}%`}
            sublabel="Dossiers decides dans les delais"
          />
        </div>

        {/* Charge actuelle */}
        <div
          className="chart-card mes-stats-charge"
          style={{ marginBottom: "1.5rem", boxShadow: "none" }}
        >
          <h3 className="pnpi-card-subtitle">Charge de travail actuelle</h3>
          <div className="mes-stats-charge-row">
            <div className="mes-stats-charge-item">
              <div className="mes-stats-charge-value">{stats.atis_assignes_actifs}</div>
              <div className="mes-stats-charge-label">ATI actifs qui vous sont assignes</div>
            </div>
            <div className="mes-stats-charge-item">
              <div
                className="mes-stats-charge-value"
                style={{
                  color: stats.atis_assignes_en_retard > 0 ? "#B42318" : "var(--gabon-green)",
                }}
              >
                {stats.atis_assignes_en_retard}
              </div>
              <div className="mes-stats-charge-label">
                en retard SLA &middot;{" "}
                <Link href="/pnpi/mes-dossiers" className="pnpi-row-action">
                  voir mes dossiers &rarr;
                </Link>
              </div>
            </div>
            <div className="mes-stats-charge-item">
              <div className="mes-stats-charge-value">{stats.total_transitions}</div>
              <div className="mes-stats-charge-label">actions totales depuis votre arrivee</div>
            </div>
          </div>
        </div>

        {/* Activite recente */}
        <div>
          <h3 className="pnpi-card-subtitle">Vos 5 dernieres actions</h3>
          {stats.activite_recente.length === 0 ? (
            <div className="pnpi-empty" style={{ padding: "1.5rem 0" }}>
              Aucune action enregistree pour l&apos;instant.
            </div>
          ) : (
            <ul className="mes-stats-activity">
              {stats.activite_recente.map((a) => (
                <li key={`${a.ati_id}-${a.changed_at}`} className="mes-stats-activity-item">
                  <div className="mes-stats-activity-main">
                    <Link href={`/pnpi/ati/${a.ati_id}`} className="pnpi-mono">
                      {a.numero_ati}
                    </Link>
                    <span className="mes-stats-activity-action">{a.action}</span>
                  </div>
                  {a.note && <div className="mes-stats-activity-note">{a.note}</div>}
                  <div className="mes-stats-activity-date">
                    {new Date(a.changed_at).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
