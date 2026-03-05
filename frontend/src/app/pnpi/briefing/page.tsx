import Link from "next/link";
import { redirect } from "next/navigation";
import {
  fetchPNPIKpis, fetchPNPISecteurs, fetchPNPIProvinces,
  fetchPNPIPipeline, fetchPNPITendances, fetchPNPIRecents,
} from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { PrintActions } from "../../briefing/PrintActions";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const STATUT_LABELS: Record<string, string> = {
  soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation",
  approuve: "Approuve", rejete: "Rejete", expire: "Expire",
};
const STATUT_COLORS: Record<string, string> = {
  soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6",
  approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af",
};

export default async function PNPIBriefingPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some(r => ALLOWED.has(r))) redirect("/pnpi");
  } catch { redirect("/connexion"); }

  const [kpis, secteurs, provinces, pipeline, tendances, recents] = await Promise.all([
    fetchPNPIKpis(), fetchPNPISecteurs(), fetchPNPIProvinces(),
    fetchPNPIPipeline(), fetchPNPITendances(), fetchPNPIRecents(),
  ]);

  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const totalEmplois = secteurs.reduce((s, sec) => s + sec.emplois_declares, 0);
  const topSecteur = secteurs.sort((a, b) => b.nb_atis_total - a.nb_atis_total)[0];
  const topProvince = provinces.sort((a, b) => b.nb_atis_actifs - a.nb_atis_actifs)[0];
  const overdueRecents = recents.filter(r => r.is_overdue).length;
  const lastTrend = tendances.slice(-2);
  const trendDelta = lastTrend.length === 2 ? lastTrend[1].nb_soumis - lastTrend[0].nb_soumis : 0;

  return (
    <section className="section briefing-shell">
      {/* Banner */}
      <div className="ministerial-banner chart-card" style={{ background: "linear-gradient(135deg, #001f5c 0%, #003F8F 60%, #005f6b 100%)", color: "white", border: "none" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #009440, #FFCD00)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.1rem", color: "#003F8F", flexShrink: 0 }}>PN</div>
            <div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Republique Gabonaise &bull; Ministere de l&apos;Industrie</p>
              <h1 style={{ margin: 0, color: "white", fontSize: "1.4rem", fontWeight: 800 }}>Briefing Ministeriel PNPI</h1>
            </div>
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.875rem" }}>
            Plateforme Nationale de Pilotage Industriel &mdash; Synthese executive de la gestion des ATI
          </p>
        </div>
        <div className="briefing-meta" style={{ color: "rgba(255,255,255,0.6)" }}>
          <span>Date : {today}</span>
          <span>Total ATIs : {kpis.atis_total}</span>
          <span>SLA : {kpis.taux_sla_pct.toFixed(0)} %</span>
        </div>
      </div>

      {/* Print / Nav actions (no print) */}
      <div className="chart-card no-print" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <PrintActions />
          <Link href="/pnpi" style={{ marginLeft: "auto", color: "#6b7280", fontSize: "0.875rem", textDecoration: "none" }}>← Dashboard PNPI</Link>
        </div>
      </div>

      {/* Resume executif */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: "ATIs en cours de traitement", value: kpis.atis_en_cours, color: "#3b82f6", detail: `sur ${kpis.atis_total} au total` },
          { label: "Délai moyen de traitement", value: `${kpis.delai_moyen_jours.toFixed(1)} j`, color: kpis.delai_moyen_jours <= 30 ? "#10b981" : "#f59e0b", detail: "Objectif : 30 jours" },
          { label: "Taux de conformite SLA", value: `${kpis.taux_sla_pct.toFixed(0)} %`, color: kpis.taux_sla_pct >= 80 ? "#10b981" : "#ef4444", detail: kpis.atis_en_retard > 0 ? `${kpis.atis_en_retard} en retard` : "Dans les delais" },
          { label: "Operateurs industriels actifs", value: kpis.operateurs_actifs, color: "#009440", detail: `${totalEmplois.toLocaleString("fr-FR")} emplois declares` },
          { label: "ATIs approuves ce mois", value: kpis.atis_approuves_ce_mois, color: "#10b981", detail: "Agrements delivres" },
          { label: "Taux de conformite inspections", value: `${kpis.taux_conformite_pct.toFixed(0)} %`, color: "#7c3aed", detail: "Derniere periode" },
        ].map(({ label, value, color, detail }) => (
          <div key={label} className="chart-card" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.3rem" }}>{label}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{detail}</div>
          </div>
        ))}
      </div>

      {/* Pipeline ATI */}
      <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "1.05rem" }}>Pipeline de traitement des ATI</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {([
            ["Soumis (en attente)", pipeline.soumis, STATUT_COLORS.soumis],
            ["En instruction", pipeline.en_instruction, STATUT_COLORS.en_instruction],
            ["En validation", pipeline.en_validation, STATUT_COLORS.en_validation],
            ["Approuves", pipeline.approuve, STATUT_COLORS.approuve],
            ["Rejetes", pipeline.rejete, STATUT_COLORS.rejete],
            ["Expires", pipeline.expire, STATUT_COLORS.expire],
          ] as [string, number, string][]).map(([label, count, color]) => {
            const total = kpis.atis_total || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "160px 1fr 50px", gap: "0.75rem", alignItems: "center" }}>
                <div style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500 }}>{label}</div>
                <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "999px", width: `${pct}%`, background: color, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analyse secteurs + provinces */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        {/* Secteurs */}
        <div className="chart-card" style={{ padding: "1.25rem" }}>
          <h2 style={{ margin: "0 0 0.875rem", color: "#003F8F", fontSize: "1rem" }}>Activite par secteur industriel</h2>
          {topSecteur && (
            <div style={{ padding: "0.625rem 0.875rem", background: "#eff6ff", borderRadius: "6px", marginBottom: "0.875rem", fontSize: "0.82rem", color: "#1d4ed8" }}>
              <strong>Secteur dominant :</strong> {topSecteur.secteur} — {topSecteur.nb_atis_total} ATIs, {topSecteur.nb_operateurs} operateurs
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                {["Secteur", "Operateurs", "ATIs", "Approuves", "Emplois"].map(h => (
                  <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: "#9ca3af", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secteurs.map(s => (
                <tr key={s.secteur} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 600, color: "#1f2937", textTransform: "capitalize" }}>{s.secteur}</td>
                  <td style={{ padding: "0.5rem", color: "#374151" }}>{s.nb_operateurs}</td>
                  <td style={{ padding: "0.5rem", color: "#374151" }}>{s.nb_atis_total}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>{s.nb_atis_approuves}</span>
                    <span style={{ color: "#9ca3af", fontSize: "0.72rem" }}> ({s.taux_approbation_pct.toFixed(0)}%)</span>
                  </td>
                  <td style={{ padding: "0.5rem", color: "#374151" }}>{s.emplois_declares.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Provinces */}
        <div className="chart-card" style={{ padding: "1.25rem" }}>
          <h2 style={{ margin: "0 0 0.875rem", color: "#003F8F", fontSize: "1rem" }}>Distribution geographique</h2>
          {topProvince && (
            <div style={{ padding: "0.625rem 0.875rem", background: "#f0fdf4", borderRadius: "6px", marginBottom: "0.875rem", fontSize: "0.82rem", color: "#166534" }}>
              <strong>Province la plus active :</strong> {topProvince.province.replace(/_/g, " ")} — {topProvince.nb_atis_actifs} ATIs actifs
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {provinces.map(p => {
              const maxATI = Math.max(...provinces.map(x => x.nb_atis_actifs), 1);
              const pct = Math.round((p.nb_atis_actifs / maxATI) * 100);
              return (
                <div key={p.province} style={{ display: "grid", gridTemplateColumns: "130px 1fr 40px", gap: "0.5rem", alignItems: "center" }}>
                  <div style={{ fontSize: "0.8rem", color: "#374151", textTransform: "capitalize" }}>{p.province.replace(/_/g, " ")}</div>
                  <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "7px", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "999px", width: `${pct}%`, background: "#009440" }} />
                  </div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#009440", textAlign: "right" }}>{p.nb_atis_actifs}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tendance mensuelle */}
      <div className="chart-card print-break" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>Tendance mensuelle des agréments</h2>
        {trendDelta !== 0 && (
          <div style={{ padding: "0.5rem 0.875rem", background: trendDelta > 0 ? "#f0fdf4" : "#fef2f2", borderRadius: "6px", marginBottom: "0.875rem", fontSize: "0.82rem", color: trendDelta > 0 ? "#166534" : "#b42318" }}>
            {trendDelta > 0 ? `↑ Hausse de +${trendDelta} dossiers soumis sur le dernier mois` : `↓ Baisse de ${trendDelta} dossiers soumis sur le dernier mois`}
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
              {["Mois", "Soumis", "Approuves", "Rejetes", "Taux approbation"].map(h => (
                <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#9ca3af", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tendances.slice(-6).reverse().map(t => {
              const total = t.nb_soumis || 1;
              const taux = total > 0 ? ((t.nb_approuves / total) * 100).toFixed(0) : "0";
              return (
                <tr key={t.mois} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "#1f2937" }}>{t.mois}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "#374151" }}>{t.nb_soumis}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "#10b981", fontWeight: 600 }}>{t.nb_approuves}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "#ef4444" }}>{t.nb_rejetes}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <span style={{ padding: "0.15rem 0.4rem", borderRadius: "4px", background: parseInt(taux) >= 70 ? "#f0fdf4" : "#fef9eb", color: parseInt(taux) >= 70 ? "#10b981" : "#d97706", fontWeight: 700, fontSize: "0.72rem" }}>
                      {taux} %
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ATIs récents + en retard */}
      <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ margin: 0, color: "#003F8F", fontSize: "1rem" }}>Dossiers ATI recents</h2>
          {overdueRecents > 0 && (
            <span style={{ padding: "0.25rem 0.75rem", background: "#fef3c7", color: "#d97706", borderRadius: "6px", fontWeight: 700, fontSize: "0.78rem" }}>
              ⚠ {overdueRecents} dossier(s) en retard SLA
            </span>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
              {["Numero ATI", "Operateur", "Secteur", "Province", "Statut", "Priorite", "Age (j)", "SLA"].map(h => (
                <th key={h} style={{ padding: "0.4rem 0.6rem", textAlign: "left", color: "#9ca3af", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recents.slice(0, 15).map(ati => (
              <tr key={ati.id} style={{ borderBottom: "1px solid #f9fafb", background: ati.is_overdue ? "#fef9eb" : "transparent" }}>
                <td style={{ padding: "0.5rem 0.6rem", fontWeight: 700, color: "#003F8F", fontFamily: "monospace", fontSize: "0.78rem" }}>{ati.numero_ati}</td>
                <td style={{ padding: "0.5rem 0.6rem", color: "#374151", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ati.raison_sociale}</td>
                <td style={{ padding: "0.5rem 0.6rem", color: "#374151", textTransform: "capitalize" }}>{ati.secteur}</td>
                <td style={{ padding: "0.5rem 0.6rem", color: "#6b7280", fontSize: "0.78rem" }}>{ati.province.replace(/_/g, " ")}</td>
                <td style={{ padding: "0.5rem 0.6rem" }}>
                  <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${STATUT_COLORS[ati.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[ati.statut] ?? "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>
                    {STATUT_LABELS[ati.statut] ?? ati.statut}
                  </span>
                </td>
                <td style={{ padding: "0.5rem 0.6rem", color: ati.priorite === "urgente" ? "#ef4444" : "#6b7280", fontWeight: ati.priorite === "urgente" ? 700 : 500, textTransform: "capitalize", fontSize: "0.78rem" }}>{ati.priorite}</td>
                <td style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 600, color: ati.age_jours > 30 ? "#d97706" : "#374151" }}>{ati.age_jours}</td>
                <td style={{ padding: "0.5rem 0.6rem", textAlign: "center" }}>
                  {ati.is_overdue
                    ? <span style={{ padding: "0.1rem 0.4rem", borderRadius: "4px", background: "#fef3c7", color: "#d97706", fontWeight: 700, fontSize: "0.68rem" }}>RETARD</span>
                    : <span style={{ color: "#10b981", fontSize: "0.72rem", fontWeight: 600 }}>OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer officiel */}
      <div style={{ textAlign: "center", padding: "1rem", borderTop: "2px solid #e5e7eb", marginTop: "1rem", fontSize: "0.75rem", color: "#9ca3af" }}>
        <strong style={{ color: "#003F8F" }}>PNPI — Plateforme Nationale de Pilotage Industriel</strong>
        <br />Ministere de l&apos;Industrie de la Republique Gabonaise &middot; Document confidentiel &middot; {today}
      </div>
    </section>
  );
}
