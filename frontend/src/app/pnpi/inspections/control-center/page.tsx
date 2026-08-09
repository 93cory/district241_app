import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchInspectionControlCenter } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "inspecteur"]);

export default async function InspectionControlCenterPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const center = await fetchInspectionControlCenter();
  const statLabels: Record<string, string> = {
    inspections_total: "Inspections",
    inspections_annee: "Inspections annee",
    missions_planifiees: "Missions planifiees",
    missions_en_retard: "Missions en retard",
    non_conformites_critiques: "NC critiques",
    actions_ouvertes: "Actions ouvertes",
    actions_en_retard: "Actions en retard",
    dossiers_a_cloturer: "A cloturer",
    operateurs_couverts: "Operateurs couverts",
    operateurs_jamais_inspectes: "Jamais inspectes",
  };
  const headline = center.headline;

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#6b7280", fontWeight: 800 }}>INSPECTION & CONTROLE</p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>Centre de controle des inspections</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563" }}>
            Vue operationnelle des missions, non-conformites, actions correctives et dossiers a cloturer.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignSelf: "center", flexWrap: "wrap" }}>
          <Link href="/pnpi/inspections/mission-orders" className="btn-secondary">Ordres de mission</Link>
          <Link href="/pnpi/inspections/compliance-intelligence" className="btn-primary">INCI</Link>
        </div>
      </div>

      <div
        style={{
          marginTop: "1.25rem",
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1.25fr) repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.85rem",
          alignItems: "stretch",
        }}
      >
        <div
          className="chart-card"
          style={{
            padding: "1.1rem",
            background: "linear-gradient(135deg, rgba(0,63,143,0.1), rgba(0,148,64,0.1))",
            border: "1px solid rgba(0,63,143,0.14)",
          }}
        >
          <div style={{ color: "#009440", fontSize: "0.76rem", fontWeight: 900, textTransform: "uppercase" }}>
            Indice national inspection
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginTop: "0.35rem" }}>
            <strong style={{ color: "#003F8F", fontSize: "2.4rem", lineHeight: 1 }}>{headline.score_national}</strong>
            <span style={{ color: "#003F8F", fontWeight: 900, fontSize: "1.4rem" }}>Grade {headline.grade}</span>
          </div>
          <p style={{ margin: "0.5rem 0 0", color: "#4b5563", lineHeight: 1.45 }}>
            Niveau de risque national : <strong>{headline.risk_level}</strong>. Lecture consolidée des inspections,
            non-conformités, actions correctives et couverture des opérateurs.
          </p>
        </div>
        <HeadlineCard label="Taux conforme" value={`${headline.taux_conformite}%`} color="#10b981" />
        <HeadlineCard label="Couverture globale" value={`${headline.couverture_globale}%`} color="#003F8F" />
        <HeadlineCard label="Couverture annuelle" value={`${headline.couverture_annuelle}%`} color="#7c3aed" />
        <HeadlineCard label="Actions cloturees" value={`${headline.taux_cloture_actions}%`} color="#d97706" />
      </div>

      {center.executive_alerts.length > 0 && (
        <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
          {center.executive_alerts.map((alert) => (
            <div key={`${alert.level}-${alert.title}`} className="chart-card" style={{ padding: "0.9rem", borderLeft: `4px solid ${alert.level === "critique" || alert.level === "urgent" ? "#b42318" : "#d97706"}` }}>
              <div style={{ color: "#111827", fontWeight: 900 }}>{alert.title}</div>
              <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.86rem" }}>{alert.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "0.85rem" }}>
        {Object.entries(center.stats).map(([key, value]) => (
          <div key={key} className="chart-card" style={{ padding: "1rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.76rem", fontWeight: 800, textTransform: "uppercase" }}>
              {statLabels[key] ?? key}
            </div>
            <div style={{ color: "#003F8F", fontSize: "1.8rem", fontWeight: 900, marginTop: "0.25rem" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(320px, 1.35fr) minmax(280px, 0.85fr)", gap: "1rem" }}>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.35rem", color: "#003F8F", fontSize: "1rem" }}>File de risque des opérateurs</h2>
          <p style={{ margin: "0 0 0.85rem", color: "#6b7280", fontSize: "0.84rem" }}>
            Priorisation automatique des contrôles selon dernière inspection, gravité des constats et actions ouvertes.
          </p>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {center.risk_queue.slice(0, 6).map((item, index) => (
              <Link
                key={item.operateur_id}
                href={`/pnpi/operateurs/${item.operateur_id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  gap: "0.75rem",
                  alignItems: "center",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "inherit",
                  background: index < 3 ? "#fff7ed" : "#fff",
                }}
              >
                <strong style={{ color: "#b42318", fontSize: "1.05rem" }}>#{index + 1}</strong>
                <div>
                  <strong style={{ color: "#111827" }}>{item.operateur}</strong>
                  <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: 2 }}>
                    {item.secteur} · {item.province} · {item.status.replace(/_/g, " ")}
                  </div>
                  <div style={{ color: "#374151", fontSize: "0.78rem", marginTop: 4 }}>{item.next_action}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#b42318", fontWeight: 900 }}>{item.risk_score}/100</div>
                  <div style={{ color: "#6b7280", fontSize: "0.72rem" }}>{item.risk_level}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>Recommandations exécutives</h2>
          <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.65rem", color: "#374151", lineHeight: 1.45 }}>
            {center.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {[
          ["missions_en_retard", "Missions en retard"],
          ["non_conformites_critiques", "Non-conformites critiques"],
          ["actions_en_retard", "Actions correctives en retard"],
          ["dossiers_a_cloturer", "Dossiers a cloturer"],
        ].map(([key, label]) => {
          const items = center.buckets[key] ?? [];
          return (
            <div key={key} className="chart-card" style={{ padding: "1rem" }}>
              <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>{label}</h2>
              {items.length === 0 ? (
                <p style={{ margin: 0, color: "#6b7280" }}>Aucun element prioritaire.</p>
              ) : (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {items.slice(0, 4).map((item, index) => (
                    <PriorityItem key={`${key}-${index}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Breakdown title="Conformite par province" data={center.by_province} />
        <Breakdown title="Conformite par secteur" data={center.by_sector} />
      </div>
    </section>
  );
}

function Breakdown({
  title,
  data,
}: {
  title: string;
  data: Record<
    string,
    {
      total: number;
      conformes: number;
      non_conformes: number;
      partiels: number;
      score_moyen?: number;
      taux_conformite?: number;
    }
  >;
}) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>{title}</h2>
      <div style={{ display: "grid", gap: "0.55rem" }}>
        {Object.entries(data).map(([key, value]) => {
          const rate = value.total ? Math.round((value.conformes / value.total) * 100) : 0;
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                <strong>{key.replace(/_/g, " ")}</strong>
                <span>{value.taux_conformite ?? rate}% conforme · score {value.score_moyen ?? "·"}</span>
              </div>
              <div style={{ height: 7, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
                <div style={{ width: `${value.taux_conformite ?? rate}%`, height: "100%", background: "#10b981" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeadlineCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.74rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: "1.75rem", fontWeight: 900, marginTop: "0.3rem" }}>{value}</div>
    </div>
  );
}

function PriorityItem({ item }: { item: unknown }) {
  const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const title =
    String(record.operateur_nom ?? record.operateur ?? record.numero ?? record.category ?? record.action ?? record.id ?? "Element prioritaire");
  const detail =
    String(record.objective ?? record.description ?? record.motive ?? record.status ?? record.statut_conformite ?? record.due_at ?? "");
  return (
    <div style={{ padding: "0.65rem", borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <strong style={{ color: "#111827", fontSize: "0.84rem" }}>{title}</strong>
      {detail && <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.78rem", lineHeight: 1.4 }}>{detail}</p>}
    </div>
  );
}
