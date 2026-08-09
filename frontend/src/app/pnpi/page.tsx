import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchPNPIKpis, fetchPNPICarte, fetchPNPIRecents, type ATIResume } from "../../lib/api";
import { fetchBackendProfile } from "../../lib/backend";
import { getDefaultRouteForRoles } from "../../lib/role-routing";
import { BriefingAudio } from "../components/BriefingAudio";

const CarteOperateurs = dynamic(() => import("./components/CarteOperateurs"), {
  ssr: false,
  loading: () => <div className="pnpi-brief-map-loading">Chargement de la carte nationale...</div>,
});

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur"]);

const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois",
  mines: "Mines",
  agroalimentaire: "Agro",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};

const formatDateLong = (): string => {
  try {
    return new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const pickGreeting = (hour: number): string => {
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon apres-midi";
  return "Bonsoir";
};

const roleLabel = (roles: string[]): string => {
  if (roles.includes("ministre")) return "Monsieur le Ministre";
  if (roles.includes("directeur")) return "Monsieur le Directeur";
  if (roles.includes("instructeur")) return "Madame / Monsieur l'Instructeur";
  if (roles.includes("admin")) return "Administrateur";
  return "Agent PNPI";
};

export default async function PNPIDashboardPage() {
  let profile;
  try {
    profile = await fetchBackendProfile();
    const roles = (profile.roles ?? []) as string[];
    if (!roles.some((r) => PNPI_ROLES.has(r))) {
      // Utilisateur authentifie mais sans acces dashboard PNPI (operateur, inspecteur).
      // On l'envoie vers son propre espace plutot que vers /connexion.
      const fallback = getDefaultRouteForRoles(roles);
      redirect(fallback && fallback !== "/pnpi" ? fallback : "/connexion");
    }
  } catch {
    redirect("/connexion");
  }

  try {
    const [kpis, carte, recents] = await Promise.all([
      fetchPNPIKpis().catch(() => null),
      fetchPNPICarte().catch(() => []),
      fetchPNPIRecents().catch(() => []),
    ]);

    if (!kpis) throw new Error("Indicateurs indisponibles");

    const greeting = pickGreeting(new Date().getHours());
    const roleTitle = roleLabel(profile.roles ?? []);
    const today = formatDateLong();
    const roles = (profile.roles ?? []) as string[];
    const canSeeDecisionCockpits = roles.some((role) => ["admin", "ministre", "directeur"].includes(role));

    const overdue: ATIResume[] = (recents ?? [])
      .filter((a: ATIResume) => a.is_overdue)
      .sort((a: ATIResume, b: ATIResume) => b.age_jours - a.age_jours)
      .slice(0, 3);

    const slaTone = kpis.taux_sla_pct >= 85 ? "good" : kpis.taux_sla_pct >= 70 ? "warn" : "alert";

    // Texte lu a voix haute par le BriefingAudio
    const audioBrief = [
      `${greeting} ${roleTitle}.`,
      `Nous sommes le ${today}.`,
      `Voici le briefing du jour.`,
      `Conformite SLA nationale : ${kpis.taux_sla_pct.toFixed(0)} pour cent.`,
      `${kpis.atis_en_retard} dossier${kpis.atis_en_retard > 1 ? "s" : ""} en retard sur ${kpis.atis_total} au total.`,
      `${kpis.atis_en_cours} dossiers en cours de traitement.`,
      `${kpis.atis_approuves_ce_mois} agrements delivres ce mois.`,
      `Delai moyen de traitement : ${kpis.delai_moyen_jours.toFixed(0)} jours.`,
      `${kpis.operateurs_actifs} operateurs industriels actifs sur les neuf provinces.`,
      overdue.length > 0
        ? `Attention : ${overdue.length} dossier${overdue.length > 1 ? "s" : ""} prioritaire${overdue.length > 1 ? "s" : ""} a traiter en urgence.`
        : `Aucun dossier prioritaire en attente.`,
    ].join(" ");

    return (
      <div className="pnpi-brief">
        {/* -------------------------------------------------- */}
        {/* En-tete ceremoniel                                 */}
        {/* -------------------------------------------------- */}
        <header className="pnpi-brief-hero">
          <div className="pnpi-brief-hero-main">
            <div className="pnpi-brief-eyebrow">
              <span className="pnpi-brief-dot" aria-hidden="true" />
              <span>Briefing du jour · {today}</span>
            </div>
            <h1 className="pnpi-brief-greeting">
              {greeting}, <span className="pnpi-brief-role">{roleTitle}</span>
            </h1>
            <p className="pnpi-brief-subtitle">
              Vue d&apos;ensemble de la situation industrielle nationale · Plateforme Nationale de
              Pilotage Industriel
            </p>
            <div className="pnpi-brief-audio">
              <BriefingAudio text={audioBrief} label="Ecouter le briefing (2 min)" />
            </div>
          </div>
          <div className="pnpi-brief-hero-aside">
            <div className={`pnpi-brief-sla pnpi-brief-sla--${slaTone}`}>
              <div className="pnpi-brief-sla-label">Conformite SLA nationale</div>
              <div className="pnpi-brief-sla-value">
                {kpis.taux_sla_pct.toFixed(0)}
                <span>%</span>
              </div>
              <div className="pnpi-brief-sla-detail">
                {kpis.atis_en_retard} dossier{kpis.atis_en_retard > 1 ? "s" : ""} en retard sur{" "}
                {kpis.atis_total}
              </div>
              <div className="pnpi-brief-sla-bar">
                <div
                  className={`pnpi-brief-sla-bar-fill pnpi-brief-sla-bar-fill--${slaTone}`}
                  style={{ width: `${Math.min(kpis.taux_sla_pct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* -------------------------------------------------- */}
        {/* 4 KPIs essentiels                                  */}
        {/* -------------------------------------------------- */}
        <section className="pnpi-brief-kpis" aria-label="Indicateurs principaux">
          <article className="pnpi-kpi pnpi-kpi--primary">
            <div className="pnpi-kpi-label">ATIs en cours</div>
            <div className="pnpi-kpi-value">{kpis.atis_en_cours.toLocaleString("fr-FR")}</div>
            <div className="pnpi-kpi-detail">Dossiers actifs en traitement</div>
          </article>

          <article className="pnpi-kpi pnpi-kpi--success">
            <div className="pnpi-kpi-label">Approuves ce mois</div>
            <div className="pnpi-kpi-value">
              {kpis.atis_approuves_ce_mois.toLocaleString("fr-FR")}
            </div>
            <div className="pnpi-kpi-detail">Agrements delivres</div>
          </article>

          <article className="pnpi-kpi pnpi-kpi--neutral">
            <div className="pnpi-kpi-label">Delai moyen</div>
            <div className="pnpi-kpi-value">
              {kpis.delai_moyen_jours.toFixed(1)}
              <span className="pnpi-kpi-unit"> j</span>
            </div>
            <div className="pnpi-kpi-detail">Objectif : 30 jours</div>
          </article>

          <article className="pnpi-kpi pnpi-kpi--accent">
            <div className="pnpi-kpi-label">Operateurs actifs</div>
            <div className="pnpi-kpi-value">{kpis.operateurs_actifs.toLocaleString("fr-FR")}</div>
            <div className="pnpi-kpi-detail">Repartis sur les 9 provinces</div>
          </article>
        </section>

        {/* -------------------------------------------------- */}
        {/* Alertes prioritaires                               */}
        {/* -------------------------------------------------- */}
        {overdue.length > 0 && (
          <section className="pnpi-brief-alerts" aria-label="Alertes prioritaires">
            <div className="pnpi-brief-section-head">
              <h2 className="pnpi-brief-section-title">A decider en priorite</h2>
              <p className="pnpi-brief-section-desc">
                Dossiers les plus critiques ayant depasse le delai de traitement reglementaire.
              </p>
            </div>
            <ul className="pnpi-brief-alerts-list">
              {overdue.map((ati) => (
                <li key={ati.id} className="pnpi-brief-alert">
                  <div className="pnpi-brief-alert-rank" aria-hidden="true">
                    !
                  </div>
                  <div className="pnpi-brief-alert-body">
                    <div className="pnpi-brief-alert-head">
                      <span className="pnpi-brief-alert-num">{ati.numero_ati}</span>
                      <span className="pnpi-brief-alert-sector">
                        {SECTEUR_LABELS[ati.secteur] ?? ati.secteur}
                      </span>
                      <span className="pnpi-brief-alert-province">
                        {ati.province.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="pnpi-brief-alert-name">{ati.raison_sociale}</div>
                  </div>
                  <div className="pnpi-brief-alert-age">
                    <div className="pnpi-brief-alert-age-value">{ati.age_jours} j</div>
                    <div className="pnpi-brief-alert-age-label">d&apos;attente</div>
                  </div>
                  <Link href={`/pnpi/ati/${ati.id}`} className="pnpi-brief-alert-cta">
                    Instruire
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/pnpi/ati?statut=en_retard" className="pnpi-brief-see-all">
              Voir tous les dossiers en retard &rarr;
            </Link>
          </section>
        )}

        {/* -------------------------------------------------- */}
        {/* Carte nationale                                    */}
        {/* -------------------------------------------------- */}
        <section className="pnpi-brief-map-section" aria-label="Carte nationale">
          <div className="pnpi-brief-section-head">
            <h2 className="pnpi-brief-section-title">Couverture nationale</h2>
            <p className="pnpi-brief-section-desc">
              {carte.length} operateurs industriels geocodes sur les 9 provinces du Gabon. Cliquez
              sur un point pour voir le detail.
            </p>
          </div>
          <div className="pnpi-brief-map">
            <CarteOperateurs operateurs={carte} />
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* Acces rapides                                      */}
        {/* -------------------------------------------------- */}
        <section className="pnpi-brief-quick-grid" aria-label="Acces rapides">
          {canSeeDecisionCockpits && (
            <Link href="/pnpi/presentation" className="pnpi-brief-quick">
              <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                🎙️
              </div>
              <div className="pnpi-brief-quick-body">
                <div className="pnpi-brief-quick-title">Présentation PNPI</div>
                <div className="pnpi-brief-quick-desc">
                  Support officiel de présentation du projet, conçu pour une projection institutionnelle.
                </div>
              </div>
              <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                &rarr;
              </span>
            </Link>
          )}

          <Link href="/pnpi/ati" className="pnpi-brief-quick">
            <div className="pnpi-brief-quick-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div className="pnpi-brief-quick-body">
              <div className="pnpi-brief-quick-title">Gestion des ATI</div>
              <div className="pnpi-brief-quick-desc">
                Instruire, valider, delivrer les agrements techniques.
              </div>
            </div>
            <span className="pnpi-brief-quick-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>

          <Link href="/pnpi/inspections" className="pnpi-brief-quick">
            <div className="pnpi-brief-quick-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
                <path d="M9 4v16" />
                <path d="M15 6v16" />
              </svg>
            </div>
            <div className="pnpi-brief-quick-body">
              <div className="pnpi-brief-quick-title">Inspections terrain</div>
              <div className="pnpi-brief-quick-desc">
                Rapports de conformite et couverture provinciale.
              </div>
            </div>
            <span className="pnpi-brief-quick-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>

          <Link href="/pnpi/reports" className="pnpi-brief-quick">
            <div className="pnpi-brief-quick-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <div className="pnpi-brief-quick-body">
              <div className="pnpi-brief-quick-title">Rapports strategiques</div>
              <div className="pnpi-brief-quick-desc">
                Bilans, impact, predictions et aide a la decision.
              </div>
            </div>
            <span className="pnpi-brief-quick-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>

          <Link href="/pnpi/rin" className="pnpi-brief-quick">
            <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
              🏭
            </div>
            <div className="pnpi-brief-quick-body">
              <div className="pnpi-brief-quick-title">RIN national</div>
              <div className="pnpi-brief-quick-desc">
                Fiche industrielle, DIUN, sites, produits, ressources et investissements.
              </div>
            </div>
            <span className="pnpi-brief-quick-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>

          <Link href="/pnpi/operateurs" className="pnpi-brief-quick">
            <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
              🧾
            </div>
            <div className="pnpi-brief-quick-body">
              <div className="pnpi-brief-quick-title">Opérateurs & fiches 360°</div>
              <div className="pnpi-brief-quick-desc">
                Annuaire industriel, fiches entreprises, score 360°, risques et historique consolidé.
              </div>
            </div>
            <span className="pnpi-brief-quick-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>

          {canSeeDecisionCockpits && (
            <>
              <Link href="/pnpi/filieres" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🔗
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Filières & chaînes de valeur</div>
                  <div className="pnpi-brief-quick-desc">
                    Souveraineté productive, maillons critiques et opportunités industrielles.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/innovation" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  ⚙️
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Innovation 4.0</div>
                  <div className="pnpi-brief-quick-desc">
                    Technologies, projets pilotes, acteurs et maturité numérique industrielle.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/capital-humain" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🎓
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Capital humain</div>
                  <div className="pnpi-brief-quick-desc">
                    Emplois, compétences, métiers en tension et formations par rôle.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/investissements" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  💼
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Investissements</div>
                  <div className="pnpi-brief-quick-desc">
                    Portefeuille national, montants, emplois, secteurs et provinces.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/zones-industrielles" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🗺️
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Zones industrielles</div>
                  <div className="pnpi-brief-quick-desc">
                    Sites, occupation, superficies et capacités territoriales.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/data-quality" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  ✅
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Qualité & gouvernance</div>
                  <div className="pnpi-brief-quick-desc">
                    Fiabilité RIN, ATI, ONI, documents, doublons et actions prioritaires.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/documents" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🗂️
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Coffre documentaire</div>
                  <div className="pnpi-brief-quick-desc">
                    Preuves ATI, pièces requises, versioning et archivage administratif.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/exploitation" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🧭
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Exploitation PNPI</div>
                  <div className="pnpi-brief-quick-desc">
                    Supervision, sauvegardes, runbooks, changements et alertes opérationnelles.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/interoperabilite" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🔌
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Interopérabilité</div>
                  <div className="pnpi-brief-quick-desc">
                    API partenaires, AGANOR, OGAPI, conventions et journal des échanges.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/geographie" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🛰️
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">SIG national</div>
                  <div className="pnpi-brief-quick-desc">
                    Couverture provinciale, géocodage, inspections, zones et priorités territoriales.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/analytique" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🧠
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">BI & IA</div>
                  <div className="pnpi-brief-quick-desc">
                    Tendances, alertes, secteurs moteurs, provinces à signal fort et recommandations.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/portail" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🧩
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Portail & UX</div>
                  <div className="pnpi-brief-quick-desc">
                    Parcours par rôle, omnicanalité, formation, communication et adoption utilisateur.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/durabilite" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🌿
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Durabilité industrielle</div>
                  <div className="pnpi-brief-quick-desc">
                    Énergie, matières, circularité, carbone et risques climatiques.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>

              <Link href="/pnpi/securite" className="pnpi-brief-quick">
                <div className="pnpi-brief-quick-icon" aria-hidden="true" style={{ fontSize: 26 }}>
                  🛡️
                </div>
                <div className="pnpi-brief-quick-body">
                  <div className="pnpi-brief-quick-title">Sécurité SOC</div>
                  <div className="pnpi-brief-quick-desc">
                    Risques, alertes, audit, MFA et supervision sécurité du PNPI.
                  </div>
                </div>
                <span className="pnpi-brief-quick-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </>
          )}
        </section>
      </div>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2 style={{ color: "#b42318", marginTop: 0 }}>Dashboard PNPI indisponible</h2>
          <p style={{ color: "#b42318" }}>{msg}</p>
          <p style={{ color: "#6b7280" }}>
            Verifiez que le backend est actif et que les tables PNPI ont ete creees.
          </p>
        </div>
      </section>
    );
  }
}
