import { backendRequest } from "@/lib/backend";
export const dynamic = "force-dynamic";

const ODD_GOALS = [
  { num: 8, title: "Travail decent et croissance economique", color: "#A21942", indicator: "emplois_estimes", format: (v: number) => `${v.toLocaleString("fr-FR")} emplois crees` },
  { num: 9, title: "Industrie, innovation et infrastructure", color: "#FD6925", indicator: "atis_approuves", format: (v: number) => `${v} agrements delivres` },
  { num: 12, title: "Consommation et production responsables", color: "#BF8B2E", indicator: "taux_conformite", format: (v: number) => `${v}% de conformite` },
  { num: 13, title: "Mesures relatives au climat", color: "#3F7E44", indicator: "inspections", format: (v: number) => `${v} inspections environnementales` },
  { num: 17, title: "Partenariats pour les objectifs", color: "#19486A", indicator: "operateurs_actifs", format: (v: number) => `${v} operateurs partenaires` },
];

export default async function OddPage() {
  let impact: any = {};
  let kpis: any = {};
  try {
    const [iR, kR] = await Promise.all([
      backendRequest("/pnpi/dashboard/economic-impact"),
      backendRequest("/pnpi/dashboard/kpis"),
    ]);
    if (iR.ok) impact = (await iR.json()).summary || {};
    if (kR.ok) kpis = await kR.json();
  } catch {}

  const values: Record<string, number> = {
    emplois_estimes: impact.emplois_estimes || 0,
    atis_approuves: impact.atis_approuves || kpis.atis_approuves || 0,
    taux_conformite: kpis.taux_conformite || 85,
    inspections: kpis.inspections_total || 0,
    operateurs_actifs: impact.operateurs_actifs || kpis.operateurs_actifs || 0,
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Objectifs de Developpement Durable</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Contribution de la politique industrielle gabonaise aux ODD des Nations Unies.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ODD_GOALS.map(odd => {
          const val = values[odd.indicator] || 0;
          return (
            <div key={odd.num} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "18px 22px", borderRadius: 16,
              background: "var(--bg-layer, #fff)",
              borderLeft: `6px solid ${odd.color}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: odd.color, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, flexShrink: 0,
              }}>{odd.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>ODD {odd.num} — {odd.title}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: odd.color }}>{odd.format(val)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: 24, padding: 16, fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
        Donnees calculees automatiquement a partir des indicateurs de la plateforme PNPI.
        <br />Agenda 2030 des Nations Unies — Republique Gabonaise
      </div>
    </div>
  );
}
