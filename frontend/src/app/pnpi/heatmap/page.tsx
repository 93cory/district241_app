import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

interface ProvinceData {
  province: string;
  label: string;
  total: number;
  conforme: number;
  non_conforme: number;
  partiel: number;
  taux_non_conformite: number;
  intensity: number;
}

function getColor(intensity: number): string {
  if (intensity >= 0.8) return "#b42318";
  if (intensity >= 0.5) return "#e65100";
  if (intensity >= 0.3) return "#d97706";
  if (intensity > 0) return "#f2b800";
  return "#006233";
}

export default async function HeatmapPage() {
  let provinces: ProvinceData[] = [];
  try {
    const res = await backendRequest("/heatmap/non-conformites");
    if (res.ok) {
      const data = await res.json();
      provinces = data.provinces || [];
    }
  } catch {}

  const totalNonConf = provinces.reduce((s, p) => s + p.non_conforme, 0);
  const totalInsp = provinces.reduce((s, p) => s + p.total, 0);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
        Carte de chaleur · Non-conformites
      </h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        {totalNonConf} non-conformite(s) sur {totalInsp} inspections par province.
      </p>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, fontSize: 12 }}>
        {[
          { color: "#006233", label: "Aucune" },
          { color: "#f2b800", label: "Faible" },
          { color: "#d97706", label: "Moyen" },
          { color: "#e65100", label: "Eleve" },
          { color: "#b42318", label: "Critique" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: l.color }} />
            <span style={{ fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Province cards as heatmap */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        {provinces.map((prov) => {
          const color = getColor(prov.intensity);
          return (
            <div
              key={prov.province}
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: "var(--bg-layer, #fff)",
                borderLeft: `5px solid ${color}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700 }}>{prov.label}</span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    background: `${color}15`,
                    color,
                  }}
                >
                  {prov.taux_non_conformite}%
                </span>
              </div>

              <div style={{ display: "flex", gap: 12, fontSize: 12, marginBottom: 8 }}>
                <span>
                  <strong style={{ color: "#006233" }}>{prov.conforme}</strong> conformes
                </span>
                <span>
                  <strong style={{ color: "#b42318" }}>{prov.non_conforme}</strong> non-conf.
                </span>
                <span>
                  <strong style={{ color: "#d97706" }}>{prov.partiel}</strong> partiels
                </span>
              </div>

              {/* Bar */}
              <div
                style={{
                  display: "flex",
                  height: 8,
                  borderRadius: 4,
                  overflow: "hidden",
                  background: "#e5e7eb",
                }}
              >
                {prov.total > 0 && (
                  <>
                    <div
                      style={{
                        width: `${(prov.conforme / prov.total) * 100}%`,
                        background: "#006233",
                      }}
                    />
                    <div
                      style={{
                        width: `${(prov.partiel / prov.total) * 100}%`,
                        background: "#d97706",
                      }}
                    />
                    <div
                      style={{
                        width: `${(prov.non_conforme / prov.total) * 100}%`,
                        background: "#b42318",
                      }}
                    />
                  </>
                )}
              </div>

              <div style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)", marginTop: 4 }}>
                {prov.total} inspection(s)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
