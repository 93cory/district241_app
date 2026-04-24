export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  operational: { color: "#006233", bg: "#dcfce7", label: "Operationnel", icon: "\u2713" },
  degraded: { color: "#d97706", bg: "#fef3c7", label: "Degrade", icon: "\u26A0" },
  down: { color: "#b42318", bg: "#fef2f2", label: "Indisponible", icon: "\u2715" },
};

export default async function StatusPage() {
  let data: any = null;
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/health/status`, { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch {}

  const overallStyle = data ? STATUS_STYLES[data.status] || STATUS_STYLES.down : STATUS_STYLES.down;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base, #f4f8fb)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 600, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
            Statut du systeme PNPI
          </h1>
          <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: 0 }}>
            Plateforme Nationale de la Politique Industrielle
          </p>
        </div>

        {/* Overall status */}
        <div
          style={{
            padding: "20px 24px",
            borderRadius: 16,
            marginBottom: 20,
            background: overallStyle.bg,
            border: `2px solid ${overallStyle.color}`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28 }}>{overallStyle.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: overallStyle.color }}>
            {data ? overallStyle.label : "Verification en cours..."}
          </div>
          {data && (
            <div style={{ fontSize: 12, color: "var(--text-soft, #526175)", marginTop: 4 }}>
              Uptime: {data.uptime_hours}h · Version {data.version}
            </div>
          )}
        </div>

        {/* Component checks */}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.checks.map((check: any, i: number) => {
              const style = STATUS_STYLES[check.status] || STATUS_STYLES.down;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "var(--bg-layer, #fff)",
                    border: "1px solid var(--line, #dce4ef)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: style.color,
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{check.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {check.latency_ms != null && (
                      <span style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
                        {check.latency_ms}ms
                      </span>
                    )}
                    {check.detail && (
                      <span style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
                        {check.detail}
                      </span>
                    )}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        background: style.bg,
                        color: style.color,
                      }}
                    >
                      {style.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            fontSize: 11,
            color: "var(--text-soft, #9ca3af)",
          }}
        >
          {data && (
            <>
              Derniere verification : {new Date(data.timestamp).toLocaleString("fr-FR")}
              <br />
            </>
          )}
          Ministere de l&apos;Industrie et de la Transformation Locale · PNPI
        </div>
      </div>
    </div>
  );
}
