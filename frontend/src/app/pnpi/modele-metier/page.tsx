import { redirect } from "next/navigation";
import { fetchBusinessModelCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

function statusTone(status: string) {
  if (status === "implémenté") return { color: "#006233", bg: "#ecfdf3" };
  if (status === "prototype partenaire") return { color: "#d97706", bg: "#fff7ed" };
  return { color: "#526175", bg: "#f8fafc" };
}

export default async function BusinessModelPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchBusinessModelCockpit();

  return (
    <section className="section">
      <header
        className="chart-card"
        style={{
          padding: "1.35rem",
          background: "linear-gradient(135deg, rgba(0,63,143,0.10), rgba(0,98,51,0.10), rgba(242,184,0,0.12))",
          border: "1px solid rgba(0,63,143,0.12)",
        }}
      >
        <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 950 }}>
          ARCHITECTURE MÉTIER DU SI INDUSTRIEL NATIONAL
        </p>
        <h1 style={{ margin: 0, color: "#003F8F" }}>Modèle conceptuel métier du PNPI</h1>
        <p style={{ margin: "0.55rem 0 0", color: "#374151", lineHeight: 1.6, maxWidth: 920 }}>
          {cockpit.vision} Ici, on ne raisonne plus d’abord en modules ou en écrans : on stabilise les objets
          métier qui deviennent le patrimoine informationnel du Ministère.
        </p>
      </header>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem", borderLeft: "5px solid #003F8F" }}>
        <div style={{ color: "#6b7280", fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase" }}>
          Lecture exécutive
        </div>
        <p style={{ margin: "0.35rem 0 0", color: "#111827", lineHeight: 1.6 }}>{cockpit.lecture_executive}</p>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="Objets canoniques" value={String(cockpit.stats.objets_canoniques ?? 0)} color="#003F8F" />
        <Kpi label="Objets implémentés" value={String(cockpit.stats.objets_implementes ?? 0)} color="#006233" />
        <Kpi label="Couverture" value={`${cockpit.stats.couverture_pct ?? 0}%`} color="#009440" />
        <Kpi label="Relations métier" value={String(cockpit.stats.relations ?? 0)} color="#7c3aed" />
        <Kpi label="Ressources RIN" value={String(cockpit.stats.ressources_rin ?? 0)} color="#b45309" />
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.65fr)", gap: "1rem" }}>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Objets métier canoniques</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
            {cockpit.objects.map((object) => {
              const tone = statusTone(object.statut);
              return (
                <article key={object.code} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "0.9rem", background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <strong style={{ color: "#111827" }}>{object.nom}</strong>
                    <span style={{ background: tone.bg, color: tone.color, borderRadius: 999, padding: "0.15rem 0.5rem", fontSize: "0.68rem", fontWeight: 900, whiteSpace: "nowrap" }}>
                      {object.statut}
                    </span>
                  </div>
                  <p style={{ margin: "0.35rem 0", color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.45 }}>{object.description}</p>
                  <div style={{ display: "grid", gap: "0.25rem", color: "#374151", fontSize: "0.76rem" }}>
                    <span>Responsable : <strong>{object.systeme_responsable}</strong></span>
                    <span>Source : <strong>{object.source}</strong></span>
                    <span>Volume : <strong>{object.volume.toLocaleString("fr-FR")}</strong></span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside style={{ display: "grid", gap: "1rem" }}>
          <div className="chart-card" style={{ padding: "1rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Principes SI</h2>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#374151", fontSize: "0.82rem", lineHeight: 1.65 }}>
              {cockpit.principes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="chart-card" style={{ padding: "1rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Livre blanc réorganisé</h2>
            <ol style={{ margin: 0, paddingLeft: "1.1rem", color: "#374151", fontSize: "0.82rem", lineHeight: 1.65 }}>
              {cockpit.architecture_cible.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Relations entre objets</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.65rem" }}>
          {cockpit.relationships.map((relation) => (
            <div key={`${relation.from}-${relation.to}-${relation.relation}`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.7rem", background: "#f8fafc" }}>
              <strong style={{ color: "#003F8F" }}>{relation.from}</strong>
              <span style={{ color: "#6b7280" }}> — {relation.relation} — </span>
              <strong style={{ color: "#006233" }}>{relation.to}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: "1.5rem", fontWeight: 950, marginTop: "0.25rem" }}>{value}</div>
    </div>
  );
}
