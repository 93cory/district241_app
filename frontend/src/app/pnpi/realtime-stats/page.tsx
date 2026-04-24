"use client";
import { useState, useEffect, useRef } from "react";

export default function RealtimeStatsPage() {
  const [kpis, setKpis] = useState<any>({});
  const [history, setHistory] = useState<{ time: string; atis: number }[]>([]);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/pnpi/dashboard/kpis");
        if (res.ok) {
          const data = await res.json();
          setKpis(data);
          setHistory((prev) => {
            const next = [
              ...prev,
              { time: new Date().toLocaleTimeString("fr-FR"), atis: data.atis_total || 0 },
            ];
            return next.slice(-20);
          });
          setTick((t) => t + 1);
        }
      } catch {}
    };
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const maxAti = Math.max(...history.map((h) => h.atis), 1);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Statistiques temps reel</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>
            Rafraichissement toutes les 5 secondes
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#006233",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#006233" }}>En direct</span>
          <span style={{ fontSize: 10, color: "var(--text-soft)", marginLeft: 8 }}>
            Tick #{tick}
          </span>
        </div>
      </div>

      {/* Live KPIs */}
      <div
        key={tick}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "ATIs total", value: kpis.atis_total || 0, color: "#051B36" },
          { label: "Approuves", value: kpis.atis_approuves || 0, color: "#006233" },
          { label: "En cours", value: kpis.atis_en_cours || 0, color: "#0c7eb4" },
          { label: "Rejetes", value: kpis.atis_rejetes || 0, color: "#b42318" },
          { label: "Operateurs", value: kpis.operateurs_actifs || 0, color: "#7c3aed" },
          {
            label: "SLA depasses",
            value: kpis.sla_overdue || 0,
            color: kpis.sla_overdue > 0 ? "#b42318" : "#006233",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="chart-card"
            style={{
              padding: "14px 16px",
              textAlign: "center",
              animation: "reveal-up 300ms ease-out",
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: k.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {k.value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Live chart */}
      <div className="chart-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>
          Historique temps reel (ATIs total)
        </h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
          {history.map((h, i) => {
            const height = (h.atis / maxAti) * 80;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <div style={{ fontSize: 7, fontWeight: 700, color: "var(--text-soft)" }}>
                  {h.atis}
                </div>
                <div
                  style={{
                    width: "100%",
                    height,
                    minHeight: 2,
                    background: i === history.length - 1 ? "#006233" : "#0c7eb4",
                    borderRadius: "2px 2px 0 0",
                    opacity: 0.5 + (i / history.length) * 0.5,
                    transition: "height 300ms ease",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "var(--text-soft, #9ca3af)",
            marginTop: 4,
          }}
        >
          <span>{history[0]?.time || ""}</span>
          <span>{history[history.length - 1]?.time || ""}</span>
        </div>
      </div>
    </div>
  );
}
