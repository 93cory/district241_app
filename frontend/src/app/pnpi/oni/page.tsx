import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchONICockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const formatNumber = (value: number) => new Intl.NumberFormat("fr-FR").format(Math.round(value));
const formatMoney = (value: number) => `${formatNumber(value)} FCFA`;

export default async function ONICockpitPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchONICockpit();
  const indicators = cockpit.indicators;

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 900 }}>
            OBSERVATOIRE NATIONAL DE L&apos;INDUSTRIE
          </p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>Centre national de pilotage industriel</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563", maxWidth: 780 }}>
            Consolidation des declarations industrielles, controle de coherence, indicateurs INPI et alertes
            strategiques pour la decision ministerielle.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignSelf: "center", flexWrap: "wrap" }}>
          <Link href="/pnpi/oni/declarations" className="btn-secondary">Declarations ONI</Link>
          <Link href="/pnpi/oni/inpi" className="btn-primary">Voir l&apos;INPI</Link>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem", borderLeft: "5px solid #009440" }}>
        <div style={{ color: "#6b7280", fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase" }}>
          Synthese automatique
        </div>
        <p style={{ margin: "0.35rem 0 0", color: "#111827", fontSize: "1rem", lineHeight: 1.6 }}>
          {cockpit.national_control_center.narrative}
        </p>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="INPI national" value={`${cockpit.inpi_national}/100`} tone="#003F8F" />
        <Kpi label="Declarations" value={formatNumber(indicators.declarations_total)} tone="#009440" />
        <Kpi label="Production" value={`${formatNumber(indicators.production_total)} t`} tone="#7c3aed" />
        <Kpi label="Emplois declares" value={formatNumber(indicators.jobs_total)} tone="#0f766e" />
        <Kpi label="Investissements" value={formatMoney(indicators.investment_fcfa)} tone="#b45309" />
        <Kpi label="Alertes ouvertes" value={formatNumber(cockpit.alerts.length)} tone="#dc2626" />
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1rem" }}>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Performance par secteur</h2>
          <BucketTable data={indicators.by_sector} empty="Aucune declaration sectorielle pour le moment." />
        </div>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Priorites ONI</h2>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {cockpit.national_control_center.priorities.map((priority, index) => (
              <div key={priority} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                <span style={{ background: "#E8F2FF", color: "#003F8F", fontWeight: 900, borderRadius: 999, padding: "0.18rem 0.55rem" }}>
                  {index + 1}
                </span>
                <span style={{ color: "#374151" }}>{priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Alertes de coherence</h2>
          {cockpit.alerts.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>Aucune alerte ouverte.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.7rem" }}>
              {cockpit.alerts.map((alert) => (
                <div key={alert.id} style={{ border: "1px solid #fee2e2", borderRadius: 12, padding: "0.8rem", background: "#fff7f7" }}>
                  <strong style={{ color: "#991b1b" }}>{alert.title}</strong>
                  <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.85rem" }}>{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Dernieres declarations</h2>
          {cockpit.latest_declarations.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>
              Pas encore de declarations ONI. Utiliser la page “Declarations ONI” pour alimenter la demo.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {cockpit.latest_declarations.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.55rem" }}>
                  <div>
                    <strong style={{ color: "#111827" }}>{item.operateur_nom}</strong>
                    <div style={{ color: "#6b7280", fontSize: "0.82rem" }}>{item.secteur} · {item.period}</div>
                  </div>
                  <span style={{ color: "#003F8F", fontWeight: 900 }}>{item.capacity_utilization_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: "0.35rem", color: tone, fontSize: "1.55rem", fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function BucketTable({ data, empty }: { data: Record<string, { production: number; emplois: number; investissement_fcfa: number; declarations: number }>; empty: string }) {
  const entries = Object.entries(data);
  if (!entries.length) return <p style={{ margin: 0, color: "#6b7280" }}>{empty}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
        <thead>
          <tr style={{ color: "#6b7280", textAlign: "left" }}>
            <th style={{ padding: "0.55rem", borderBottom: "1px solid #e5e7eb" }}>Secteur</th>
            <th style={{ padding: "0.55rem", borderBottom: "1px solid #e5e7eb" }}>Production</th>
            <th style={{ padding: "0.55rem", borderBottom: "1px solid #e5e7eb" }}>Emplois</th>
            <th style={{ padding: "0.55rem", borderBottom: "1px solid #e5e7eb" }}>Invest.</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td style={{ padding: "0.55rem", borderBottom: "1px solid #f3f4f6", fontWeight: 800 }}>{key}</td>
              <td style={{ padding: "0.55rem", borderBottom: "1px solid #f3f4f6" }}>{formatNumber(value.production)} t</td>
              <td style={{ padding: "0.55rem", borderBottom: "1px solid #f3f4f6" }}>{formatNumber(value.emplois)}</td>
              <td style={{ padding: "0.55rem", borderBottom: "1px solid #f3f4f6" }}>{formatMoney(value.investissement_fcfa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
