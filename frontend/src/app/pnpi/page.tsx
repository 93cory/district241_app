import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  fetchPNPIKpis,
  fetchPNPICarte,
  fetchPNPISecteurs,
  fetchPNPIPipeline,
  fetchPNPITendances,
  fetchPNPIRecents,
  fetchTransformationIndex,
  type ATIResume,
  type TransformationIndexData,
} from "../../lib/api";
import { fetchBackendProfile } from "../../lib/backend";
import { KpiCard } from "../components/KpiCard";
import { SearchBar } from "./components/SearchBar";
import { TransformationIndex } from "./TransformationIndex";

const DashboardRefresh = dynamic(() => import("./components/DashboardRefresh"), { ssr: false });
const CarteOperateurs = dynamic(() => import("./components/CarteOperateurs"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "400px", background: "#f9fafb", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", border: "1px solid #e5e7eb" }}>
      Chargement de la carte...
    </div>
  ),
});
const ATIPipelineChart = dynamic(() => import("./components/ATIPipelineChart"), { ssr: false });
const SecteurChart = dynamic(() => import("./components/SecteurChart"), { ssr: false });
const TendanceChart = dynamic(() => import("./components/TendanceChart"), { ssr: false });

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur"]);

const STATUT_LABELS: Record<string, string> = {
  soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation",
  approuve: "Approuve", rejete: "Rejete", expire: "Expire",
};
const STATUT_COLORS: Record<string, string> = {
  soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6",
  approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af",
};
const PRIORITE_COLORS: Record<string, string> = {
  normale: "#6b7280", elevee: "#f59e0b", urgente: "#ef4444",
};
const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois", mines: "Mines", agroalimentaire: "Agro",
  btp: "BTP", petrole: "Petrole", services: "Services",
};

function ATITable({ recents }: { recents: ATIResume[] }) {
  if (!recents.length) return <p style={{ color: "#9ca3af", margin: 0 }}>Aucun ATI recent.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
            {["Numero ATI","Operateur","Secteur","Province","Statut","Priorite","Age (j)","SLA"].map((h) => (
              <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", fontSize: "0.73rem", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recents.map((ati) => (
            <tr key={ati.id} style={{ borderBottom: "1px solid #f9fafb", background: ati.is_overdue ? "#fef9eb" : "transparent" }}>
              <td style={{ padding: "0.625rem 0.75rem", fontWeight: 600, color: "#003F8F", fontFamily: "monospace", fontSize: "0.8rem" }}>{ati.numero_ati}</td>
              <td style={{ padding: "0.625rem 0.75rem", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ati.raison_sociale}</td>
              <td style={{ padding: "0.625rem 0.75rem", color: "#374151" }}>{SECTEUR_LABELS[ati.secteur] ?? ati.secteur}</td>
              <td style={{ padding: "0.625rem 0.75rem", color: "#6b7280", fontSize: "0.8rem" }}>{ati.province.replace(/_/g, " ")}</td>
              <td style={{ padding: "0.625rem 0.75rem" }}>
                <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", background: `${STATUT_COLORS[ati.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[ati.statut] ?? "#6b7280", fontWeight: 600, fontSize: "0.73rem" }}>
                  {STATUT_LABELS[ati.statut] ?? ati.statut}
                </span>
              </td>
              <td style={{ padding: "0.625rem 0.75rem" }}>
                <span style={{ color: PRIORITE_COLORS[ati.priorite] ?? "#6b7280", fontWeight: ati.priorite === "urgente" ? 700 : 500, fontSize: "0.8rem", textTransform: "capitalize" }}>{ati.priorite}</span>
              </td>
              <td style={{ padding: "0.625rem 0.75rem", textAlign: "right", fontWeight: 600, color: ati.age_jours > 30 ? "#d97706" : "#374151" }}>{ati.age_jours}</td>
              <td style={{ padding: "0.625rem 0.75rem", textAlign: "center" }}>
                {ati.is_overdue
                  ? <span style={{ padding: "0.15rem 0.5rem", borderRadius: "4px", background: "#fef3c7", color: "#d97706", fontWeight: 700, fontSize: "0.7rem" }}>RETARD</span>
                  : <span style={{ color: "#10b981", fontSize: "0.75rem", fontWeight: 600 }}>OK</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PNPIDashboardPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
  } catch { redirect("/connexion"); }

  try {
    const [kpis, carte, secteurs, pipeline, tendances, recents, transformationIndex] = await Promise.all([
      fetchPNPIKpis().catch(() => null),
      fetchPNPICarte().catch(() => []),
      fetchPNPISecteurs().catch(() => []),
      fetchPNPIPipeline().catch(() => []),
      fetchPNPITendances().catch(() => []),
      fetchPNPIRecents().catch(() => []),
      fetchTransformationIndex().catch(() => null),
    ]);

    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    return (
      <>
        {/* Header */}
        <section className="section" style={{ paddingBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#003F8F,#009440)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>PN</div>
                <h1 style={{ margin: 0, color: "#003F8F", fontSize: "1.4rem", fontWeight: 700 }}>Dashboard Ministeriel &mdash; PNPI</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <p style={{ margin: 0, color: "#6c7a8c", fontSize: "0.875rem" }}>Plateforme Nationale de Pilotage Industriel &middot; {today}</p>
                <DashboardRefresh />
              </div>
            </div>
            <SearchBar />
            <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/pnpi/ati" style={{ padding: "0.5rem 1rem", background: "#003F8F", color: "#fff", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Gestion ATI</Link>
              <Link href="/pnpi/operateurs" style={{ padding: "0.5rem 1rem", background: "#009440", color: "#fff", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Operateurs</Link>
              <Link href="/pnpi/inspections" style={{ padding: "0.5rem 1rem", background: "#7c3aed", color: "#fff", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Inspections</Link>
              <Link href="/pnpi/notifications" style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "#fff", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Alertes</Link>
              <Link href="/pnpi/historique" style={{ padding: "0.5rem 1rem", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Historique</Link>
              <Link href="/pnpi/stats" style={{ padding: "0.5rem 1rem", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Statistiques</Link>
              <a href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/pnpi/dashboard/export-recap.pdf`} target="_blank" rel="noopener noreferrer" style={{ padding: "0.5rem 1rem", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>&#8595; Recap PDF</a>
              <a href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/exports/executive-report.pdf`} target="_blank" rel="noopener noreferrer" style={{ padding: "0.5rem 1rem", background: "#003F8F", color: "#fff", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>&#8595; Rapport Executif</a>
            </div>
          </div>
        </section>

        {/* KPI Banner */}
        <section className="hero-grid">
          <KpiCard title="ATIs en cours" value={String(kpis.atis_en_cours)} detail="Dossiers actifs en traitement" />
          <KpiCard title="Delai moyen" value={`${kpis.delai_moyen_jours.toFixed(1)} j`} detail="Objectif : 30 jours max" />
          <KpiCard title="Taux SLA" value={`${kpis.taux_sla_pct.toFixed(0)} %`} detail="Dossiers traites dans les delais" />
          <KpiCard title="Operateurs actifs" value={String(kpis.operateurs_actifs)} detail="Enregistres sur la plateforme" />
          <KpiCard title="Approuves ce mois" value={String(kpis.atis_approuves_ce_mois)} detail="Agrements delivres ce mois" />
          <KpiCard title="En retard SLA" value={String(kpis.atis_en_retard)} detail={kpis.atis_en_retard > 0 ? "Necessite attention immediate" : "Aucun retard SLA"} />
        </section>

        {/* SLA Bar */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#374151", fontWeight: 600 }}>Conformite SLA globale</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: kpis.taux_sla_pct >= 80 ? "#10b981" : kpis.taux_sla_pct >= 60 ? "#f59e0b" : "#ef4444" }}>{kpis.taux_sla_pct.toFixed(1)} %</span>
            </div>
            <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "10px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "999px", width: `${Math.min(kpis.taux_sla_pct, 100)}%`, background: kpis.taux_sla_pct >= 80 ? "linear-gradient(90deg,#009440,#10b981)" : kpis.taux_sla_pct >= 60 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "linear-gradient(90deg,#dc2626,#ef4444)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{kpis.atis_en_retard} en retard sur {kpis.atis_total} au total</span>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Conformite inspections : {kpis.taux_conformite_pct.toFixed(0)} %</span>
            </div>
          </div>
        </section>

        {/* Inspections summary */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/pnpi/inspections" style={{ flex: "1 1 200px", textDecoration: "none" }}>
              <div className="chart-card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#7c3aed15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>🔍</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#003F8F", fontSize: "0.9rem" }}>Inspections terrain</div>
                  <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: "0.15rem" }}>Rapports de conformite des inspecteurs</div>
                </div>
                <div style={{ marginLeft: "auto", color: "#7c3aed", fontWeight: 700, fontSize: "0.8rem" }}>Voir →</div>
              </div>
            </Link>
            <Link href="/pnpi/guichet" style={{ flex: "1 1 200px", textDecoration: "none" }}>
              <div className="chart-card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#00944015", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>📬</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#003F8F", fontSize: "0.9rem" }}>Guichet numerique</div>
                  <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: "0.15rem" }}>Depot et suivi des demandes ATI</div>
                </div>
                <div style={{ marginLeft: "auto", color: "#009440", fontWeight: 700, fontSize: "0.8rem" }}>Voir →</div>
              </div>
            </Link>
          </div>
        </section>

        {/* Transformation Index */}
        {transformationIndex && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 320px", maxWidth: "420px" }}>
                <TransformationIndex data={transformationIndex} />
              </div>
              <div style={{ flex: "2 1 400px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
                  <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "1rem" }}>Pipeline ATI</h3>
                  <p style={{ margin: "0 0 1rem", color: "#6c7a8c", fontSize: "0.8rem" }}>Distribution par statut de traitement</p>
                  <ATIPipelineChart pipeline={pipeline} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Carte + Pipeline */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: "3 1 420px" }}>
              <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
                <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "1rem" }}>Carte des operateurs industriels</h3>
                <p style={{ margin: "0 0 0.75rem", color: "#6c7a8c", fontSize: "0.8rem" }}>{carte.length} operateurs geocodes sur les 9 provinces &mdash; cliquez pour le detail</p>
                <CarteOperateurs operateurs={carte} />
              </div>
            </div>
            {!transformationIndex && (
              <div style={{ flex: "2 1 280px" }}>
                <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
                  <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "1rem" }}>Pipeline ATI</h3>
                  <p style={{ margin: "0 0 1rem", color: "#6c7a8c", fontSize: "0.8rem" }}>Distribution par statut de traitement</p>
                  <ATIPipelineChart pipeline={pipeline} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Charts */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
                <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "1rem" }}>Activite par secteur industriel</h3>
                <p style={{ margin: "0 0 0.75rem", color: "#6c7a8c", fontSize: "0.8rem" }}>Operateurs, ATIs actifs et approuves par secteur</p>
                <SecteurChart secteurs={secteurs} />
              </div>
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
                <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "1rem" }}>Tendance mensuelle des ATIs</h3>
                <p style={{ margin: "0 0 0.75rem", color: "#6c7a8c", fontSize: "0.8rem" }}>Soumissions, approbations et rejets par mois</p>
                <TendanceChart tendances={tendances} />
              </div>
            </div>
          </div>
        </section>

        {/* ATIs Recents */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ margin: 0, color: "#003F8F", fontSize: "1rem" }}>ATIs recents</h3>
              <Link href="/pnpi/ati" style={{ color: "#003F8F", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>Voir tous &rarr;</Link>
            </div>
            <ATITable recents={recents} />
          </div>
        </section>
      </>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2 style={{ color: "#b42318", marginTop: 0 }}>Dashboard PNPI indisponible</h2>
          <p style={{ color: "#b42318" }}>{msg}</p>
          <p style={{ color: "#6b7280" }}>Verifiez que le backend est actif et que les tables PNPI ont ete creees (alembic upgrade head).</p>
        </div>
      </section>
    );
  }
}
