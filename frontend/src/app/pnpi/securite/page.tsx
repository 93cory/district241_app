import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { fetchSOCCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

function riskTone(level: string) {
  if (level === "critique") return { color: "#b42318", bg: "#fff1f2" };
  if (level === "élevé") return { color: "#d97706", bg: "#fff7ed" };
  if (level === "modéré") return { color: "#0c7eb4", bg: "#eff6ff" };
  return { color: "#006233", bg: "#ecfdf3" };
}

function statusTone(status: string) {
  if (status === "implémenté") return { color: "#006233", bg: "#ecfdf3" };
  if (status === "partiel") return { color: "#d97706", bg: "#fff7ed" };
  if (status === "prototype") return { color: "#7c3aed", bg: "#f5f3ff" };
  return { color: "#526175", bg: "#f8fafc" };
}

export default async function SecuritySOCPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchSOCCockpit();
  const tone = riskTone(cockpit.risk_level);

  return (
    <section className="section">
      <header className="chart-card" style={{ padding: "1.35rem", borderLeft: `5px solid ${tone.color}` }}>
        <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 950 }}>
          DOMAINE MÉTIER 12 · FAM-SEC-001
        </p>
        <h1 style={{ margin: 0, color: "#003F8F" }}>Sécurité, SOC, cybersécurité et audit</h1>
        <p style={{ margin: "0.55rem 0 0", color: "#374151", lineHeight: 1.6, maxWidth: 920 }}>
          Supervision continue, journalisation centralisée, détection des incidents, qualification,
          réponse coordonnée et amélioration permanente du niveau de sécurité du PNPI.
        </p>
      </header>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem", background: tone.bg }}>
        <div style={{ color: tone.color, fontWeight: 950, textTransform: "uppercase", fontSize: "0.78rem" }}>
          Lecture exécutive SOC
        </div>
        <p style={{ margin: "0.35rem 0 0", color: "#111827", lineHeight: 1.6 }}>{cockpit.lecture_executive}</p>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="Risque SOC" value={`${cockpit.risk_score}/100`} color={tone.color} />
        <Kpi label="Utilisateurs" value={String(cockpit.stats.users ?? 0)} color="#003F8F" />
        <Kpi label="2FA activée" value={`${cockpit.stats.mfa_rate ?? 0}%`} color="#006233" />
        <Kpi label="Échecs 7j" value={String(cockpit.stats.failed_logins_7d ?? 0)} color="#b42318" />
        <Kpi label="Comptes verrouillés" value={String(cockpit.stats.locked_users ?? 0)} color="#d97706" />
        <Kpi label="Actions sensibles" value={String(cockpit.stats.sensitive_actions_7d ?? 0)} color="#7c3aed" />
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 0.8fr)", gap: "1rem" }}>
        <Panel title="Cycle de gestion des incidents">
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {cockpit.incident_cycle.map((step, index) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <span style={{ width: 28, height: 28, borderRadius: 999, background: "#003F8F", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 950, fontSize: "0.75rem" }}>
                  {index + 1}
                </span>
                <strong style={{ color: "#111827" }}>{step}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Alertes SOC">
          {cockpit.alerts.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>Aucune alerte majeure détectée.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {cockpit.alerts.map((alert) => {
                const alertTone = riskTone(alert.severity);
                return (
                  <div key={alert.title} style={{ border: `1px solid ${alertTone.color}33`, background: alertTone.bg, borderRadius: 12, padding: "0.75rem" }}>
                    <strong style={{ color: alertTone.color }}>{alert.title}</strong>
                    <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.82rem" }}>{alert.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        <Panel title="Règles métier SEC-CYB">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.rules.map((rule) => {
              const ruleTone = statusTone(rule.statut);
              return (
                <div key={rule.code} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <strong style={{ color: "#003F8F" }}>{rule.code}</strong>
                    <span style={{ background: ruleTone.bg, color: ruleTone.color, borderRadius: 999, padding: "0.15rem 0.5rem", fontSize: "0.68rem", fontWeight: 900 }}>
                      {rule.statut}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0", color: "#111827", fontSize: "0.82rem" }}>{rule.libelle}</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "0.76rem" }}>{rule.preuve}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Comptes / IP à surveiller">
          <h3 style={{ margin: "0 0 0.5rem", color: "#111827", fontSize: "0.9rem" }}>Utilisateurs</h3>
          <MiniList items={cockpit.top_failed_users.map((item) => [item.username, item.count])} empty="Aucun utilisateur en échec répété." />
          <h3 style={{ margin: "1rem 0 0.5rem", color: "#111827", fontSize: "0.9rem" }}>Adresses IP</h3>
          <MiniList items={cockpit.top_failed_ips.map((item) => [item.ip, item.count])} empty="Aucune IP en échec répété." />
        </Panel>

        <Panel title="Événements d'audit récents">
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {cockpit.recent_events.slice(0, 8).map((event) => (
              <div key={event.id} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.5rem", fontSize: "0.78rem" }}>
                <strong style={{ color: "#111827" }}>{event.action}</strong>
                <div style={{ color: "#6b7280", marginTop: 2 }}>
                  {event.actor} · {event.timestamp ? new Date(event.timestamp).toLocaleString("fr-FR") : "date inconnue"}
                </div>
              </div>
            ))}
          </div>
        </Panel>
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>{title}</h2>
      {children}
    </div>
  );
}

function MiniList({ items, empty }: { items: Array<[string, number]>; empty: string }) {
  if (!items.length) return <p style={{ margin: 0, color: "#6b7280", fontSize: "0.82rem" }}>{empty}</p>;
  return (
    <div style={{ display: "grid", gap: "0.45rem" }}>
      {items.map(([label, count]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
          <strong>{label}</strong>
          <span>{count}</span>
        </div>
      ))}
    </div>
  );
}
