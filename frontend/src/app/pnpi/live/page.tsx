"use client";

import { useState, useEffect, useRef } from "react";

interface LiveKpis {
  atis_total: number;
  atis_en_cours: number;
  atis_approuves: number;
  atis_rejetes: number;
  inspections_total: number;
  operateurs_actifs: number;
  sla_overdue: number;
  last_updated: string;
}

export default function LiveDashboardPage() {
  const [kpis, setKpis] = useState<LiveKpis | null>(null);
  const [connected, setConnected] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchKpis = async () => {
    try {
      const res = await fetch("/api/pnpi/dashboard/kpis");
      if (res.ok) {
        const data = await res.json();
        setKpis({
          atis_total: data.atis_total || 0,
          atis_en_cours: data.atis_en_cours || 0,
          atis_approuves: data.atis_approuves || 0,
          atis_rejetes: data.atis_rejetes || 0,
          inspections_total: data.inspections_total || 0,
          operateurs_actifs: data.operateurs_actifs || 0,
          sla_overdue: data.sla_overdue || 0,
          last_updated: new Date().toISOString(),
        });
        setPulseKey((k) => k + 1);
        setConnected(true);
      }
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    intervalRef.current = setInterval(fetchKpis, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const cards = kpis
    ? [
        { label: "ATIs total", value: kpis.atis_total, color: "#051B36", icon: "📋" },
        { label: "En cours", value: kpis.atis_en_cours, color: "#0c7eb4", icon: "⏳" },
        { label: "Approuves", value: kpis.atis_approuves, color: "#006233", icon: "✓" },
        { label: "Rejetes", value: kpis.atis_rejetes, color: "#b42318", icon: "✕" },
        { label: "Inspections", value: kpis.inspections_total, color: "#7c3aed", icon: "🔍" },
        { label: "Operateurs actifs", value: kpis.operateurs_actifs, color: "#0c7eb4", icon: "🏭" },
        {
          label: "SLA depasses",
          value: kpis.sla_overdue,
          color: kpis.sla_overdue > 0 ? "#b42318" : "#006233",
          icon: "⚠",
        },
      ]
    : [];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Dashboard Temps Reel</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-soft, #526175)" }}>
            Mise a jour automatique toutes les 10 secondes
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: connected ? "#006233" : "#b42318",
              animation: connected ? "pulse 2s infinite" : "none",
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: connected ? "#006233" : "#b42318" }}>
            {connected ? "En direct" : "Deconnecte"}
          </span>
        </div>
      </div>

      {!kpis ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-soft, #526175)" }}>
          Chargement des donnees en direct...
        </div>
      ) : (
        <>
          <div
            key={pulseKey}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {cards.map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "18px 20px",
                  borderRadius: 16,
                  background: "var(--bg-layer, #fff)",
                  border: `2px solid ${card.color}20`,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                  animation: "reveal-up 400ms ease-out",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft, #526175)" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--text-soft, #9ca3af)",
            }}
          >
            Derniere mise a jour : {new Date(kpis.last_updated).toLocaleTimeString("fr-FR")}
          </div>
        </>
      )}
    </div>
  );
}
