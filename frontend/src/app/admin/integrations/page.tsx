"use client";

import { useState, useEffect } from "react";

interface Check {
  name: string; type: string; status: string;
  latency_ms: number | null; detail: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  operational: { color: "#006233", bg: "#dcfce7", label: "OK", icon: "\u2713" },
  configured: { color: "#0c7eb4", bg: "#e0f2fe", label: "Configure", icon: "\u2699" },
  degraded: { color: "#d97706", bg: "#fef3c7", label: "Degrade", icon: "\u26A0" },
  down: { color: "#b42318", bg: "#fef2f2", label: "Hors ligne", icon: "\u2715" },
  not_configured: { color: "#526175", bg: "#f3f4f6", label: "Non configure", icon: "\u2014" },
};

const TYPE_ICONS: Record<string, string> = {
  database: "\u{1F5C4}\uFE0F", storage: "\u{1F4E6}", email: "\u{1F4E7}",
  api_key: "\u{1F511}", monitoring: "\u{1F4CA}",
};

export default function IntegrationsPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [overall, setOverall] = useState("operational");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/integration-health/status")
      .then(r => r.json())
      .then(d => { setChecks(d.checks || []); setOverall(d.overall || "down"); })
      .catch(() => setOverall("down"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const overallStyle = STATUS_STYLES[overall] || STATUS_STYLES.down;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Sante des integrations</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>Monitoring des services externes connectes a PNPI.</p>
        </div>
        <button onClick={load} disabled={loading} style={{
          padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-layer)",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>{loading ? "..." : "Rafraichir"}</button>
      </div>

      {/* Overall */}
      <div style={{
        padding: "16px 20px", borderRadius: 14, marginBottom: 16, textAlign: "center",
        background: overallStyle.bg, border: `2px solid ${overallStyle.color}`,
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: overallStyle.color }}>
          {overallStyle.icon} {overallStyle.label}
        </span>
      </div>

      {/* Checks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map(check => {
          const style = STATUS_STYLES[check.status] || STATUS_STYLES.down;
          return (
            <div key={check.name} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 12,
              background: "var(--bg-layer, #fff)", border: "1px solid var(--line, #dce4ef)",
            }}>
              <span style={{ fontSize: 20 }}>{TYPE_ICONS[check.type] || "\u{1F517}"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{check.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>{check.detail}</div>
              </div>
              {check.latency_ms != null && (
                <span style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>{check.latency_ms}ms</span>
              )}
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: style.bg, color: style.color,
              }}>{style.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
