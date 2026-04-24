import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIAlerts, PNPIAlert } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { NotificationsSeverityFilter } from "./NotificationsSeverityFilter";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f59e0b",
  medium: "#3b82f6",
  info: "#6b7280",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  info: "Info",
};

const TYPE_LABELS: Record<string, string> = {
  sla_overdue: "Retard SLA",
  non_conforme: "Non conforme",
  expiring_soon: "Expiration ATI",
};

function linkForAlert(alert: PNPIAlert): string | null {
  if (!alert.target_id) return null;
  if (alert.type === "sla_overdue" || alert.type === "expiring_soon") return "/pnpi/ati";
  if (alert.type === "non_conforme") return "/pnpi/inspections";
  return null;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Il y a ${diffD}j`;
  const diffM = Math.floor(diffD / 30);
  return `Il y a ${diffM} mois`;
}

type SearchParams = { severity?: string };

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some(r => ALLOWED.has(r))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  try {
    const alerts = await fetchPNPIAlerts();

    const activeSeverity = searchParams.severity ?? "";

    const totalCount = alerts.length;
    const criticalCount = alerts.filter(a => a.severity === "critical").length;
    const highCount = alerts.filter(a => a.severity === "high").length;
    const mediumCount = alerts.filter(a => a.severity === "medium").length;
    const slaCount = alerts.filter(a => a.type === "sla_overdue").length;
    const ncCount = alerts.filter(a => a.type === "non_conforme").length;
    const expiringCount = alerts.filter(a => a.type === "expiring_soon").length;

    // Filter by severity if specified
    const filteredAlerts = activeSeverity
      ? alerts.filter(a => a.severity === activeSeverity)
      : alerts;

    return (
      <section className="section">
        {/* Breadcrumb */}
        <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
          <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>
            &larr; Dashboard
          </Link>
        </div>

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#003F8F" }}>{totalCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Total alertes</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#dc2626" }}>{criticalCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Critiques</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b" }}>{highCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Hautes</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#3b82f6" }}>{mediumCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Moyennes</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#dc2626" }}>{slaCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Retard SLA</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ef4444" }}>{ncCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Non conforme</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b" }}>{expiringCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Expiration ATI</div>
          </div>
        </div>

        {/* Alert list */}
        <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
          <h2 style={{ margin: "0 0 0.25rem", color: "#003F8F" }}>Alertes PNPI</h2>
          <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.875rem" }}>
            {totalCount} alerte(s) &middot;{" "}
            <span style={{ color: "#dc2626", fontWeight: 600 }}>{criticalCount} critiques</span> &middot;{" "}
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>{highCount} hautes</span>
          </p>

          {/* Severity filter tabs */}
          <NotificationsSeverityFilter
            activeSeverity={activeSeverity}
            counts={{ all: totalCount, critical: criticalCount, high: highCount, medium: mediumCount, info: totalCount - criticalCount - highCount - mediumCount }}
          />

          {filteredAlerts.length === 0 ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem 0" }}>Aucune alerte.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filteredAlerts.map((alert, idx) => {
                const sevColor = SEVERITY_COLORS[alert.severity] ?? "#6b7280";
                const href = linkForAlert(alert);
                const card = (
                  <div
                    key={idx}
                    style={{
                      padding: "0.875rem 1rem",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #f3f4f6",
                      cursor: href ? "pointer" : "default",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          {/* Severity badge */}
                          <span
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "999px",
                              background: `${sevColor}18`,
                              color: sevColor,
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                          </span>
                          {/* Type badge */}
                          <span
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "999px",
                              background: "#e5e7eb",
                              color: "#374151",
                              fontWeight: 600,
                              fontSize: "0.72rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {TYPE_LABELS[alert.type] ?? alert.type}
                          </span>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#003F8F",
                            fontSize: "0.85rem",
                            marginTop: "0.35rem",
                          }}
                        >
                          {alert.title}
                        </div>
                        <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "#374151" }}>
                          {alert.message}
                        </p>
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          marginTop: "0.15rem",
                        }}
                      >
                        {relativeTime(alert.created_at)}
                      </div>
                    </div>
                  </div>
                );

                if (href) {
                  return (
                    <Link key={idx} href={href} style={{ textDecoration: "none", display: "block" }}>
                      {card}
                    </Link>
                  );
                }
                return card;
              })}
            </div>
          )}
        </div>
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2>
          <p style={{ color: "#b42318" }}>{msg}</p>
        </div>
      </section>
    );
  }
}
