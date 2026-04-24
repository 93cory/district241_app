import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  ok: { color: "#006233", bg: "#dcfce7", icon: "\u2713" },
  warning: { color: "#d97706", bg: "#fef3c7", icon: "\u26A0" },
  critical: { color: "#b42318", bg: "#fef2f2", icon: "\u2715" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "#006233",
  B: "#0c7eb4",
  C: "#d97706",
  D: "#e65100",
  E: "#b42318",
};

export default async function DataQualityPage() {
  let data: any = null;
  try {
    const res = await backendRequest("/pnpi/dashboard/data-quality");
    if (res.ok) data = await res.json();
  } catch {}

  if (!data) {
    return <div style={{ padding: 32, textAlign: "center" }}>Erreur de chargement.</div>;
  }

  const gradeColor = GRADE_COLORS[data.grade] || "#526175";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Qualite des donnees</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        Indicateurs de completude et coherence des donnees PNPI.
      </p>

      {/* Global score */}
      <div className="chart-card" style={{ padding: 24, textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${gradeColor}12`,
              border: `4px solid ${gradeColor}`,
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800, color: gradeColor }}>{data.grade}</span>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: gradeColor }}>
              {data.global_score}%
            </div>
            <div style={{ fontSize: 13, color: "var(--text-soft, #526175)" }}>
              Score global de qualite
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{data.stats.operateurs}</div>
            <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>Operateurs</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{data.stats.atis}</div>
            <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>ATIs</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{data.stats.inspections}</div>
            <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>Inspections</div>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.checks.map((check: any) => {
          const style = STATUS_STYLES[check.status] || STATUS_STYLES.warning;
          return (
            <div key={check.name} className="chart-card" style={{ padding: "14px 18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: style.bg,
                      color: style.color,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {style.icon}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{check.name}</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: style.color }}>
                  {check.score}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-soft, #526175)", marginBottom: 6 }}>
                {check.description}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--line, #e5e7eb)" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    width: `${check.score}%`,
                    background: style.color,
                    transition: "width 500ms ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
