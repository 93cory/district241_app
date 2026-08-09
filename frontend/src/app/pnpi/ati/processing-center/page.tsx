import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIATIProcessingCenter } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const ROLE_ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur"]);

const BUCKET_LABELS: Record<string, string> = {
  urgents: "Urgents",
  incomplets: "Dossiers incomplets",
  complements: "Complements ouverts",
  avis_attendus: "Avis attendus",
  a_signer: "A signer",
  en_instruction: "En instruction",
  en_validation: "En validation",
};

export default async function ATIProcessingCenterPage() {
  try {
    const profile = await fetchBackendProfile();
    const roles = (profile.roles ?? []) as string[];
    if (!roles.some((role) => ROLE_ALLOWED.has(role))) redirect("/pnpi");
  } catch {
    redirect("/connexion");
  }

  const center = await fetchPNPIATIProcessingCenter();

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#6b7280", fontWeight: 700 }}>
            GESTION DES ATI
          </p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>Centre de traitement des dossiers</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563" }}>
            Une vue unique pour savoir quoi traiter, par qui, et pourquoi un dossier bloque.
          </p>
        </div>
        <Link href="/pnpi/ati/business-rules" className="btn-secondary" style={{ alignSelf: "center" }}>
          Regles ATI
        </Link>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.85rem" }}>
        {Object.entries(center.stats).map(([key, value]) => (
          <div key={key} className="chart-card" style={{ padding: "1rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
              {key.replace(/_/g, " ")}
            </div>
            <div style={{ marginTop: "0.3rem", color: "#003F8F", fontSize: "1.7rem", fontWeight: 900 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {Object.entries(center.buckets).map(([bucket, items]) => (
          <div key={bucket} className="chart-card" style={{ padding: "1rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>
              {BUCKET_LABELS[bucket] ?? bucket} ({items.length})
            </h2>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {items.length === 0 ? (
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>Aucun dossier.</p>
              ) : (
                items.slice(0, 6).map((item) => (
                  <Link
                    key={`${bucket}-${item.id}`}
                    href={`/pnpi/ati/${item.id}`}
                    style={{
                      display: "block",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      textDecoration: "none",
                      color: "inherit",
                      background: item.is_overdue ? "#fef2f2" : "white",
                    }}
                  >
                    <strong style={{ color: "#003F8F", fontFamily: "monospace" }}>{item.numero_ati}</strong>
                    <p style={{ margin: "0.25rem 0 0", color: "#374151", fontSize: "0.85rem" }}>
                      {item.operateur}
                    </p>
                    <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                      Action : <strong>{item.next_action}</strong>
                    </p>
                    {item.blocking_reasons.length > 0 && (
                      <p style={{ margin: "0.3rem 0 0", color: "#b42318", fontSize: "0.76rem" }}>
                        {item.blocking_reasons[0]}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
                      <Badge label={`Préparation ${item.score_preparation}/100`} color={item.score_preparation >= 70 ? "#006233" : "#d97706"} />
                      <Badge label={`Urgence ${item.score_urgence}/100`} color={item.score_urgence >= 60 ? "#b42318" : "#526175"} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>File complete</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.65rem" }}>Dossier</th>
                <th style={{ padding: "0.65rem" }}>Operateur</th>
                <th style={{ padding: "0.65rem" }}>Statut</th>
                <th style={{ padding: "0.65rem" }}>Age/SLA</th>
                <th style={{ padding: "0.65rem" }}>Préparation</th>
                <th style={{ padding: "0.65rem" }}>État décisionnel</th>
                <th style={{ padding: "0.65rem" }}>Responsable</th>
                <th style={{ padding: "0.65rem" }}>Prochaine action</th>
              </tr>
            </thead>
            <tbody>
              {center.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.65rem" }}>
                    <Link href={`/pnpi/ati/${item.id}`} style={{ color: "#003F8F", fontWeight: 800 }}>
                      {item.numero_ati}
                    </Link>
                    <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>{item.type_demande}</div>
                  </td>
                  <td style={{ padding: "0.65rem" }}>{item.operateur}</td>
                  <td style={{ padding: "0.65rem" }}>{item.statut}</td>
                  <td style={{ padding: "0.65rem", color: item.is_overdue ? "#b42318" : "#374151" }}>
                    {item.age_jours}/{item.sla_jours} j
                  </td>
                  <td style={{ padding: "0.65rem" }}>
                    <div style={{ color: item.score_preparation >= 70 ? "#006233" : "#d97706", fontWeight: 900 }}>
                      {item.score_preparation}/100
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.74rem" }}>Urgence {item.score_urgence}/100</div>
                  </td>
                  <td style={{ padding: "0.65rem" }}>{item.decision_state}</td>
                  <td style={{ padding: "0.65rem" }}>{item.responsible}</td>
                  <td style={{ padding: "0.65rem" }}>{item.next_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ borderRadius: 999, background: "#f8fafc", color, padding: "0.16rem 0.45rem", fontSize: "0.68rem", fontWeight: 900 }}>
      {label}
    </span>
  );
}
