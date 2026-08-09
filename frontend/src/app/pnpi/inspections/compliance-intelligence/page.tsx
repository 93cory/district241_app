import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchComplianceIntelligence } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "inspecteur"]);

const RISK_COLORS: Record<string, string> = {
  critique: "#b42318",
  eleve: "#e65100",
  modere: "#d97706",
  maitrise: "#10b981",
};

export default async function ComplianceIntelligencePage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const data = await fetchComplianceIntelligence();

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#6b7280", fontWeight: 800 }}>
            INTELLIGENCE DE CONFORMITE
          </p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>INCI · Indice National de Conformite Industrielle</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563" }}>
            Score de pilotage pour orienter les inspections vers les entreprises et zones a risque.
          </p>
        </div>
        <Link href="/pnpi/inspections/control-center" className="btn-secondary" style={{ alignSelf: "center" }}>
          Centre de controle
        </Link>
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1.25rem", background: "#eff6ff" }}>
        <div style={{ color: "#6b7280", fontWeight: 800, textTransform: "uppercase", fontSize: "0.78rem" }}>
          Score national
        </div>
        <div style={{ color: "#003F8F", fontSize: "3rem", fontWeight: 950, lineHeight: 1 }}>
          {data.inci_national}/100
        </div>
        <p style={{ margin: "0.55rem 0 0", color: "#374151" }}>
          Base de calcul : derniere inspection connue par entreprise, gravite des non-conformites et actions ouvertes.
        </p>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <ScoreList title="Score moyen par province" data={data.by_province} />
        <ScoreList title="Score moyen par secteur" data={data.by_sector} />
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>Entreprises a suivre en priorite</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.65rem" }}>Entreprise</th>
                <th style={{ padding: "0.65rem" }}>Score</th>
                <th style={{ padding: "0.65rem" }}>Risque</th>
                <th style={{ padding: "0.65rem" }}>NC critiques</th>
                <th style={{ padding: "0.65rem" }}>Actions ouvertes</th>
                <th style={{ padding: "0.65rem" }}>Derniere inspection</th>
              </tr>
            </thead>
            <tbody>
              {data.operators.slice(0, 20).map((operator) => (
                <tr key={operator.operateur_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.65rem" }}>
                    <Link href={`/pnpi/operateurs/${operator.operateur_id}`} style={{ color: "#003F8F", fontWeight: 800 }}>
                      {operator.operateur}
                    </Link>
                    <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                      {operator.secteur} · {operator.province}
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem", fontWeight: 900 }}>{operator.score}/100</td>
                  <td style={{ padding: "0.65rem", color: RISK_COLORS[operator.risk_level] ?? "#374151", fontWeight: 900 }}>
                    {operator.risk_level}
                  </td>
                  <td style={{ padding: "0.65rem" }}>{operator.critical_findings}</td>
                  <td style={{ padding: "0.65rem" }}>{operator.open_actions}</td>
                  <td style={{ padding: "0.65rem" }}>
                    {new Date(operator.last_inspection).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.5rem", color: "#003F8F", fontSize: "1rem" }}>Methode indicative</h2>
        <p style={{ margin: 0, color: "#4b5563", fontSize: "0.9rem" }}>
          Pondérations proposées :{" "}
          {Object.entries(data.methodology)
            .map(([key, value]) => `${key.replace(/_/g, " ")} ${value}%`)
            .join(" · ")}
          . Ces pondérations devront être validées par le Ministère.
        </p>
      </div>
    </section>
  );
}

function ScoreList({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>{title}</h2>
      <div style={{ display: "grid", gap: "0.55rem" }}>
        {Object.entries(data).map(([key, score]) => (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <strong>{key.replace(/_/g, " ")}</strong>
              <span>{score}/100</span>
            </div>
            <div style={{ height: 7, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
              <div style={{ width: `${score}%`, height: "100%", background: score < 65 ? "#e65100" : "#10b981" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
