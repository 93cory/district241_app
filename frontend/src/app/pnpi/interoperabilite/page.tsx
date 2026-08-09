import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchInteroperabiliteCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  configured: { color: "#006233", bg: "#dcfce7", label: "Configuré" },
  prototype: { color: "#0c7eb4", bg: "#e0f2fe", label: "Prototype" },
  not_configured: { color: "#b45309", bg: "#fef3c7", label: "À configurer" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "#006233",
  B: "#0c7eb4",
  C: "#b45309",
  D: "#b42318",
};

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");
const normalize = (value: string) => value.replaceAll("_", " ");

export default async function InteroperabilitePage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchInteroperabiliteCockpit();
  const gradeColor = GRADE_COLORS[cockpit.grade] || "#526175";

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>FAM-INT-001 · INTEROPÉRABILITÉ NATIONALE</p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Cockpit d’interopérabilité PNPI</h1>
      <p style={{ color: "#4b5563", maxWidth: 980 }}>{cockpit.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "1rem" }}>
        <Panel title="Score interopérabilité">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ ...scoreBadgeStyle, background: `${gradeColor}14`, borderColor: gradeColor, color: gradeColor }}>
              {cockpit.grade}
            </div>
            <div>
              <div style={{ fontSize: "2.2rem", fontWeight: 950, color: gradeColor }}>
                {cockpit.score_interoperabilite}/100
              </div>
              <p style={{ margin: 0, color: "#6b7280" }}>API, conventions, connecteurs et traçabilité des échanges.</p>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Partenaires" value={formatNumber(cockpit.stats.partenaires)} color="#003F8F" />
          <Kpi label="Configurés" value={formatNumber(cockpit.stats.connecteurs_configures)} color="#009440" />
          <Kpi label="Prototypes" value={formatNumber(cockpit.stats.connecteurs_prototype)} color="#0c7eb4" />
          <Kpi label="API exposées" value={formatNumber(cockpit.stats.api_exposees)} color="#7c3aed" />
          <Kpi label="Conventions" value={formatNumber(cockpit.stats.conventions)} color="#b45309" />
          <Kpi label="Échanges" value={formatNumber(cockpit.stats.echanges_journalises)} color="#0f766e" />
          <Kpi label="Préparation moy." value={`${cockpit.stats.preparation_moyenne}/100`} color="#003F8F" />
          <Kpi label="Flux sensibles" value={formatNumber(cockpit.stats.flux_sensibles)} color="#b42318" />
        </div>
      </div>

      <Panel title="Partenaires et connecteurs" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
          {cockpit.partners.map((partner) => {
            const style = STATUS_STYLES[partner.status] || STATUS_STYLES.not_configured;
            return (
              <div key={partner.code} style={boxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{partner.name}</strong>
                  <span style={{ ...badgeStyle, background: style.bg, color: style.color }}>{style.label}</span>
                </div>
                <p style={{ margin: "0.35rem 0", color: "#4b5563", fontSize: "0.84rem" }}>{partner.purpose}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.78rem" }}>
                  Mode : {normalize(partner.mode)} · Sensibilité : {partner.data_sensitivity}
                </p>
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                  Base : {partner.legal_basis}
                </p>
                <div style={{ marginTop: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#374151" }}>
                    <strong>Préparation</strong>
                    <span>{partner.readiness_score}/100</span>
                  </div>
                  <Progress value={partner.readiness_score} color={partner.readiness_score >= 70 ? "#009440" : "#d97706"} />
                </div>
                <p style={{ margin: "0.45rem 0 0", color: "#4b5563", fontSize: "0.78rem" }}>
                  Responsable : {partner.owner}
                </p>
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.76rem" }}>
                  Scopes : {partner.allowed_scopes.join(", ")}
                </p>
                {partner.blockers.length > 0 && (
                  <p style={{ margin: "0.35rem 0 0", color: "#b45309", fontSize: "0.76rem" }}>
                    À lever : {partner.blockers[0]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "1rem" }}>
        <Panel title="Maturité interopérabilité">
          {cockpit.maturity_matrix.map((item) => (
            <div key={item.dimension} style={{ padding: "0.55rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                <strong>{item.label}</strong>
                <span>{item.score}/100 · {item.statut}</span>
              </div>
              <Progress value={item.score} color={item.score >= 75 ? "#009440" : item.score >= 45 ? "#d97706" : "#b42318"} />
            </div>
          ))}
        </Panel>

        <Panel title="Catalogue API métier">
          {cockpit.api_catalog.map((api) => (
            <div key={api.endpoint} style={{ padding: "0.75rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#111827" }}>{api.domain}</strong>
              <p style={{ margin: "0.25rem 0", color: "#003F8F", fontSize: "0.82rem" }}>
                <code>{api.endpoint}</code>
              </p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.8rem" }}>
                Consommateurs : {api.consumers.join(", ")} · Sécurité : {api.security}
              </p>
            </div>
          ))}
        </Panel>

        <Panel title="Parcours d’échange sécurisé">
          {cockpit.exchange_flow.map((item) => (
            <div key={item.step} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem", padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ ...badgeStyle, color: "#003F8F", background: "#eff6ff" }}>{item.step}</span>
              <p style={{ margin: 0, color: "#4b5563", fontSize: "0.84rem" }}>{item.detail}</p>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "1rem" }}>
        <Panel title="Feuille de route interinstitutionnelle">
          {cockpit.roadmap.map((item) => (
            <div key={item.horizon} style={{ borderLeft: "4px solid #003F8F", paddingLeft: "0.75rem", marginBottom: "0.75rem" }}>
              <strong style={{ color: "#003F8F" }}>{item.horizon}</strong>
              <p style={{ margin: "0.25rem 0", color: "#374151", fontSize: "0.84rem" }}>{item.objectif}</p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.78rem" }}>Livrable : {item.livrable}</p>
            </div>
          ))}
        </Panel>

        <Panel title="Registre des risques d’interopérabilité">
          {cockpit.risk_register.map((item) => (
            <div key={item.risque} style={{ padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong style={{ color: "#111827" }}>{item.risque}</strong>
                <span style={{ ...badgeStyle, background: item.niveau === "élevé" ? "#fff1f2" : "#fff7ed", color: item.niveau === "élevé" ? "#b42318" : "#b45309" }}>
                  {item.niveau}
                </span>
              </div>
              <p style={{ margin: "0.3rem 0 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.5 }}>{item.mesure}</p>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "1rem" }}>
        <Panel title="Actions prioritaires">
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
            {cockpit.priority_actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Garde-fous institutionnels">
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
            {cockpit.governance_rules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {cockpit.missing_conventions.length > 0 && (
            <p style={{ margin: "0.85rem 0 0", color: "#b45309", fontWeight: 800 }}>
              Conventions à cadrer : {cockpit.missing_conventions.join(", ")}
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Journal des échanges" style={{ marginTop: "1rem" }}>
        {cockpit.recent_exchanges.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>
            Aucun échange API externe journalisé pour le moment. Le registre dédié est une prochaine étape de production.
          </p>
        ) : (
          cockpit.recent_exchanges.map((event) => (
            <div key={event.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.6rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <span>{event.action}</span>
              <span style={{ color: "#6b7280" }}>{new Date(event.timestamp).toLocaleString("fr-FR")}</span>
            </div>
          ))
        )}
      </Panel>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: "1.35rem", fontWeight: 950, marginTop: "0.25rem" }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="chart-card" style={{ padding: "1rem", ...style }}>
      <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>{title}</h2>
      {children}
    </div>
  );
}

function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 5 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color }} />
    </div>
  );
}

const scoreBadgeStyle: CSSProperties = {
  width: 92,
  height: 92,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  border: "5px solid",
  fontSize: "2rem",
  fontWeight: 950,
};

const badgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: "0.28rem 0.55rem",
  fontSize: "0.72rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const boxStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "0.75rem",
  background: "#f8fafc",
};
