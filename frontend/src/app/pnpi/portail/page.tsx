import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchPortalCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const GRADE_COLORS: Record<string, string> = {
  A: "#006233",
  B: "#0c7eb4",
  C: "#b45309",
  D: "#b42318",
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  actif: { color: "#006233", bg: "#dcfce7" },
  prototype: { color: "#b45309", bg: "#fef3c7" },
  "à renforcer": { color: "#b42318", bg: "#fef2f2" },
};

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");
const roleLabel = (role: string) =>
  ({
    admin: "Administrateur",
    ministre: "Ministre",
    directeur: "Directeur",
    instructeur: "Instructeur",
    inspecteur: "Inspecteur",
    operateur: "Opérateur",
  })[role] || role;

export default async function PortailPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const data = await fetchPortalCockpit();
  const gradeColor = GRADE_COLORS[data.grade] || "#526175";

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>FAM-PORT-001 · PORTAIL, UX & OMNICANALITÉ</p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Cockpit expérience utilisateur PNPI</h1>
      <p style={{ color: "#4b5563", maxWidth: 1000 }}>{data.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "1rem" }}>
        <Panel title="Score portail">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ ...scoreBadgeStyle, background: `${gradeColor}14`, borderColor: gradeColor, color: gradeColor }}>
              {data.grade}
            </div>
            <div>
              <div style={{ fontSize: "2.2rem", fontWeight: 950, color: gradeColor }}>{data.score_portail}/100</div>
              <p style={{ margin: 0, color: "#6b7280" }}>Expérience par rôle, canaux, formation, communication et sécurité d'usage.</p>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Utilisateurs actifs" value={formatNumber(data.stats.active_users)} color="#003F8F" />
          <Kpi label="Rôles couverts" value={`${formatNumber(data.stats.roles_couverts)}/6`} color="#009440" />
          <Kpi label="Connexions 7j" value={formatNumber(data.stats.connexions_7j)} color="#0c7eb4" />
          <Kpi label="Notifications" value={formatNumber(data.stats.notifications)} color="#b45309" />
          <Kpi label="Messages" value={formatNumber(data.stats.messages)} color="#7c3aed" />
          <Kpi label="MFA" value={`${formatNumber(data.stats.mfa_rate)}%`} color="#be123c" />
        </div>
      </div>

      <Panel title="Parcours par profil" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
          {data.role_journeys.map((journey) => (
            <div key={journey.role} style={boxStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                <strong style={{ color: "#111827" }}>{roleLabel(journey.role)}</strong>
                <span style={{ color: "#003F8F", fontWeight: 950 }}>{journey.coverage}%</span>
              </div>
              <p style={{ margin: "0.35rem 0", color: "#4b5563", fontSize: "0.84rem" }}>{journey.mission}</p>
              <Link href={journey.entry} className="btn-secondary" style={{ display: "inline-flex", marginTop: "0.25rem" }}>
                Entrée : {journey.entry}
              </Link>
              <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {journey.highlights.map((item) => (
                  <span key={item} style={{ ...badgeStyle, background: "#eef2ff", color: "#003F8F" }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "1rem" }}>
        <Panel title="Capacités UX">
          {data.ux_capabilities.map((item) => (
            <ProgressLine key={item.name} label={item.name} score={item.score} status={item.status} hint={item.detail} />
          ))}
        </Panel>

        <Panel title="Canaux omnicanaux">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {data.channels.map((channel) => {
              const style = STATUS_STYLES[channel.status] || STATUS_STYLES.prototype;
              return (
                <div key={channel.channel} style={boxStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <strong style={{ color: "#111827" }}>{channel.channel}</strong>
                    <span style={{ ...badgeStyle, color: style.color, background: style.bg }}>{channel.status}</span>
                  </div>
                  <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.83rem" }}>{channel.usage}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "1rem" }}>
        <Panel title="Entrées institutionnelles">
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {data.institutional_routes.map((route) => (
              <Link key={route.href} href={route.href} style={{ ...boxStyle, display: "block", textDecoration: "none" }}>
                <strong style={{ color: "#003F8F" }}>{route.label}</strong>
                <p style={{ margin: "0.18rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
                  {route.audience} · {route.href}
                </p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Répartition des comptes par rôle">
          {data.role_counts.map((item) => (
            <ProgressLine
              key={item.role}
              label={roleLabel(item.role)}
              score={Math.min(item.users * 20, 100)}
              status="actif"
              hint={`${formatNumber(item.users)} utilisateur(s)`}
            />
          ))}
        </Panel>
      </div>

      <Panel title="Améliorations recommandées avant présentation" style={{ marginTop: "1rem" }}>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
          {data.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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

function ProgressLine({ label, score, status, hint }: { label: string; score: number; status: string; hint: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.prototype;
  return (
    <div style={{ padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <strong style={{ color: "#111827" }}>{label}</strong>
          <p style={{ margin: "0.18rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{hint}</p>
        </div>
        <span style={{ ...badgeStyle, color: style.color, background: style.bg }}>{score}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "#edf2f7", marginTop: "0.45rem", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(score, 100)}%`, height: "100%", background: style.color }} />
      </div>
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
