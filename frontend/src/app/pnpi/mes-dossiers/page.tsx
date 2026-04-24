import { backendRequest, fetchBackendProfile } from "../../../lib/backend";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "directeur", "instructeur"]);

interface ATI {
  id: string;
  numero_ati: string;
  type_activite: string;
  secteur: string;
  statut: string;
  etape: string;
  priorite: string;
  age_jours: number;
  sla_jours: number;
  is_overdue: boolean;
  raison_sociale?: string;
}

const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois", mines: "Mines", agroalimentaire: "Agro",
  btp: "BTP", petrole: "Petrole", services: "Services", peche: "Peche",
};

const STATUT_LABELS: Record<string, string> = {
  soumis: "Soumis",
  en_instruction: "En instruction",
  en_validation: "En validation",
  approuve: "Approuve",
  rejete: "Rejete",
  expire: "Expire",
};

// Score de priorite du jour : plus haut = plus urgent a traiter
function priorityScore(ati: ATI): number {
  const priorityWeight: Record<string, number> = { urgente: 3, elevee: 2, normale: 1 };
  const statusWeight: Record<string, number> = {
    en_validation: 3,   // pres de la decision finale
    en_instruction: 2,
    soumis: 1,
  };

  const pw = priorityWeight[ati.priorite] ?? 1;
  const sw = statusWeight[ati.statut] ?? 1;

  // Ratio age / SLA (>1 = depasse)
  const ratio = ati.sla_jours > 0 ? ati.age_jours / ati.sla_jours : 1;

  // Bonus enorme si en retard
  const overdueBonus = ati.is_overdue ? 100 : 0;

  return overdueBonus + (ratio * 50) + (pw * 10) + sw;
}

function slaStatus(ati: ATI): { label: string; tone: "critical" | "warning" | "ok" } {
  if (ati.is_overdue) return { label: `+${ati.age_jours - ati.sla_jours}j de retard`, tone: "critical" };
  const remaining = ati.sla_jours - ati.age_jours;
  if (remaining <= 3) return { label: `${remaining}j restants`, tone: "warning" };
  return { label: `${remaining}j restants`, tone: "ok" };
}

function AtiRow({ ati, rank }: { ati: ATI; rank?: number }) {
  const sla = slaStatus(ati);
  return (
    <Link href={`/pnpi/ati/${ati.id}`} className={`dossier-row ${ati.is_overdue ? "is-overdue" : ""}`}>
      {rank && <span className="dossier-rank">{rank}</span>}
      <div className="dossier-body">
        <div className="dossier-head">
          <span className="pnpi-mono">{ati.numero_ati}</span>
          <span className={`pnpi-pill pnpi-pill--${ati.secteur}`}>
            {SECTEUR_LABELS[ati.secteur] ?? ati.secteur}
          </span>
          <span className={`pnpi-pill pnpi-pill--${ati.priorite}`}>
            {ati.priorite}
          </span>
          <span className={`pnpi-pill pnpi-pill--${ati.statut}`}>
            {STATUT_LABELS[ati.statut] ?? ati.statut}
          </span>
        </div>
        <div className="dossier-name">
          {ati.raison_sociale ?? ati.type_activite?.slice(0, 80)}
        </div>
      </div>
      <div className={`dossier-sla dossier-sla--${sla.tone}`}>
        <div className="dossier-age">J+{ati.age_jours}</div>
        <div className="dossier-sla-label">{sla.label}</div>
      </div>
      <span className="pnpi-row-action" aria-hidden="true">&rarr;</span>
    </Link>
  );
}

export default async function MesDossiersPage() {
  let username = "";
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) redirect("/connexion");
    username = profile.username;
  } catch {
    redirect("/connexion");
  }

  let atis: ATI[] = [];
  let error = "";

  try {
    const res = await backendRequest("/pnpi/ati?assigned_to_me=true", { cache: "no-store" });
    if (res.ok) atis = await res.json();
    else error = "Impossible de charger vos dossiers.";
  } catch {
    error = "Erreur de connexion.";
  }

  const actifs = atis.filter((a) => !["approuve", "rejete", "expire"].includes(a.statut));
  const decides = atis.filter((a) => ["approuve", "rejete"].includes(a.statut));

  // Top 5 a traiter aujourd'hui : score decroissant
  const top5 = [...actifs]
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 5);

  const overdueCount = actifs.filter((a) => a.is_overdue).length;

  return (
    <section className="section">
      <div className="chart-card">
        <div className="pnpi-page-head">
          <div>
            <Link href="/pnpi" className="pnpi-back-link">&larr; Tableau de bord</Link>
            <h2>Mes dossiers</h2>
            <p className="pnpi-page-sub">
              {actifs.length} actif(s){" "}
              {overdueCount > 0 && <>&middot; <span className="pnpi-overdue-count">{overdueCount} en retard SLA</span> </>}
              &middot; {decides.length} decide(s) &middot; utilisateur : <strong>{username}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">{error}</div>
        )}

        {/* Top 5 prioritaires */}
        {top5.length > 0 && (
          <div className="dossier-top5">
            <div className="dossier-top5-head">
              <h3 className="pnpi-card-subtitle">A traiter en priorite aujourd&apos;hui</h3>
              <p className="pnpi-page-sub">
                Classement calcule sur SLA + priorite + etape + age du dossier.
              </p>
            </div>
            <div className="dossier-list dossier-list--top5">
              {top5.map((ati, i) => <AtiRow key={ati.id} ati={ati} rank={i + 1} />)}
            </div>
          </div>
        )}

        {/* Liste complete des actifs restants */}
        {actifs.length > top5.length && (
          <div className="dossier-section">
            <h3 className="pnpi-card-subtitle">Autres dossiers actifs ({actifs.length - top5.length})</h3>
            <div className="dossier-list">
              {actifs
                .filter((a) => !top5.find((t) => t.id === a.id))
                .sort((a, b) => priorityScore(b) - priorityScore(a))
                .map((ati) => <AtiRow key={ati.id} ati={ati} />)}
            </div>
          </div>
        )}

        {/* Decides */}
        {decides.length > 0 && (
          <div className="dossier-section">
            <h3 className="pnpi-card-subtitle">Dossiers decides ({decides.length})</h3>
            <div className="dossier-list">
              {decides.map((ati) => <AtiRow key={ati.id} ati={ati} />)}
            </div>
          </div>
        )}

        {atis.length === 0 && !error && (
          <div className="pnpi-empty">
            <div className="pnpi-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>Aucun dossier ne vous est assigne pour l&apos;instant.</div>
          </div>
        )}
      </div>
    </section>
  );
}
