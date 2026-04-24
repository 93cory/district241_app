export const dynamic = "force-dynamic";

export default async function EmbedStatusPage() {
  let data: any = null;
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/health/status`, { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch {}

  const status = data?.status || "down";
  const colors: Record<string, string> = {
    operational: "#006233",
    degraded: "#d97706",
    down: "#b42318",
  };
  const labels: Record<string, string> = {
    operational: "Operationnel",
    degraded: "Degrade",
    down: "Indisponible",
  };
  const color = colors[status] || colors.down;

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily: "Manrope, system-ui, sans-serif",
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 10,
            background: `${color}10`,
            border: `1.5px solid ${color}30`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color }}>
            PNPI {labels[status] || "Inconnu"}
          </span>
          {data?.uptime_hours && (
            <span style={{ fontSize: 10, color: "#6b7280" }}>Uptime {data.uptime_hours}h</span>
          )}
        </div>
      </body>
    </html>
  );
}
