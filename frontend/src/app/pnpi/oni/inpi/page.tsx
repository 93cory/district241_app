import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchONIInpi } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

export default async function ONIInpiPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const inpi = await fetchONIInpi();

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 900 }}>ONI · INDICE NATIONAL</p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>INPI — Indice National de Performance Industrielle</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563", maxWidth: 780 }}>
            Score composite de performance industrielle : production, emploi, investissement, conformite, intrants
            locaux et balance commerciale.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignSelf: "center", flexWrap: "wrap" }}>
          <Link href="/pnpi/oni" className="btn-secondary">Cockpit ONI</Link>
          <Link href="/pnpi/oni/declarations" className="btn-primary">Declarations</Link>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(240px, 0.7fr) 1.3fr", gap: "1rem", alignItems: "stretch" }}>
        <div className="chart-card" style={{ padding: "1.25rem", display: "grid", placeItems: "center", textAlign: "center" }}>
          <div style={{ width: 170, height: 170, borderRadius: "50%", border: "16px solid #E8F2FF", display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 10px #00944022" }}>
            <div>
              <div style={{ color: "#003F8F", fontSize: "2.5rem", fontWeight: 950 }}>{inpi.inpi_national}</div>
              <div style={{ color: "#6b7280", fontWeight: 900 }}>/100</div>
            </div>
          </div>
          <p style={{ color: "#4b5563", lineHeight: 1.5 }}>
            L&apos;INPI donne au Ministre une lecture rapide de la dynamique industrielle nationale.
          </p>
        </div>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Methodologie de calcul</h2>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {Object.entries(inpi.methodology).map(([key, weight]) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.86rem" }}>
                  <strong>{key.replace(/_/g, " ")}</strong>
                  <span>{weight}%</span>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ width: `${weight}%`, height: "100%", background: "#003F8F" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "1rem" }}>
        <Breakdown title="INPI par secteur" data={inpi.by_sector} />
        <Breakdown title="INPI par province" data={inpi.by_province} />
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Classement des entreprises suivies</h2>
        {inpi.operators.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>Aucune entreprise n&apos;a encore de score INPI.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr style={{ color: "#6b7280", textAlign: "left" }}>
                  <th style={th}>Entreprise</th>
                  <th style={th}>Secteur</th>
                  <th style={th}>Province</th>
                  <th style={th}>Periode</th>
                  <th style={th}>Score</th>
                </tr>
              </thead>
              <tbody>
                {inpi.operators.map((item) => (
                  <tr key={item.operateur_id}>
                    <td style={td}><strong>{item.operateur}</strong></td>
                    <td style={td}>{item.secteur}</td>
                    <td style={td}>{item.province}</td>
                    <td style={td}>{item.period}</td>
                    <td style={td}>
                      <span style={{ color: item.score >= 70 ? "#047857" : item.score >= 50 ? "#b45309" : "#b91c1c", fontWeight: 950 }}>
                        {item.score}/100
                      </span>
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

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>{title}</h2>
      {entries.length === 0 ? (
        <p style={{ margin: 0, color: "#6b7280" }}>Aucune donnee consolidee.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {entries.map(([key, value]) => (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.86rem" }}>
                <strong>{key}</strong>
                <span>{value}/100</span>
              </div>
              <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 4 }}>
                <div style={{ width: `${value}%`, height: "100%", background: value >= 70 ? "#009440" : "#f59e0b" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const th = { padding: "0.55rem", borderBottom: "1px solid #e5e7eb" };
const td = { padding: "0.55rem", borderBottom: "1px solid #f3f4f6" };
