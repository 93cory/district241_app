"use client";
import { useState, useEffect } from "react";

export default function SecurityPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/metrics/usage").then((r) => (r.ok ? r.json() : {})),
      fetch("/api/admin/audit-logs?action=auth.login_failed&limit=20").then((r) =>
        r.ok ? r.json() : { events: [] },
      ),
      fetch("/api/admin/audit-logs?action=auth.login&limit=20").then((r) =>
        r.ok ? r.json() : { events: [] },
      ),
    ])
      .then(([usage, failed, logins]) => {
        setData({ usage, failed_logins: failed.events || [], recent_logins: logins.events || [] });
      })
      .catch(() => {});
  }, []);

  if (!data) return <div style={{ padding: 32, textAlign: "center" }}>Chargement...</div>;

  const failedCount = data.failed_logins.length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Securite</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Requetes totales", value: data.usage.total_requests || 0, color: "#051B36" },
          { label: "Erreurs", value: data.usage.total_errors || 0, color: "#b42318" },
          {
            label: "Taux erreur",
            value: `${data.usage.error_rate || 0}%`,
            color: data.usage.error_rate > 5 ? "#b42318" : "#006233",
          },
          {
            label: "Echecs connexion",
            value: failedCount,
            color: failedCount > 5 ? "#b42318" : "#d97706",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="chart-card"
            style={{ padding: "14px 16px", textAlign: "center" }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Failed logins */}
        <div className="chart-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "#b42318" }}>
            Tentatives echouees
          </h3>
          {data.failed_logins.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-soft)" }}>
              Aucune tentative echouee recente.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.failed_logins.map((e: any) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    padding: "4px 0",
                    borderBottom: "1px solid var(--line, #eee)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{e.actor || "inconnu"}</span>
                  <span style={{ color: "var(--text-soft, #9ca3af)", fontSize: 10 }}>
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent logins */}
        <div className="chart-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "#006233" }}>
            Connexions recentes
          </h3>
          {data.recent_logins.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-soft)" }}>Aucune connexion recente.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.recent_logins.map((e: any) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    padding: "4px 0",
                    borderBottom: "1px solid var(--line, #eee)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{e.actor}</span>
                  <span style={{ color: "var(--text-soft, #9ca3af)", fontSize: 10 }}>
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
