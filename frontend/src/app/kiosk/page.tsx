"use client";

import { useState, useEffect } from "react";

interface KpiData {
  atis_total: number;
  atis_approuves: number;
  atis_en_cours: number;
  operateurs_actifs: number;
  inspections_total: number;
  sla_overdue: number;
}

export default function KioskPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [time, setTime] = useState(new Date());
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/pnpi/dashboard/kpis")
        .then((r) => r.json())
        .then(setKpis)
        .catch(() => {});
    };
    fetchData();
    const dataInterval = setInterval(fetchData, 30000);
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    const slideInterval = setInterval(() => setSlideIdx((i) => (i + 1) % 3), 12000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
      clearInterval(slideInterval);
    };
  }, []);

  const slides = [
    // Slide 1: KPIs
    <div
      key="kpis"
      style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, padding: "0 60px" }}
    >
      {[
        { label: "ATIs Total", value: kpis?.atis_total || 0, color: "#fff" },
        { label: "Approuves", value: kpis?.atis_approuves || 0, color: "#4ade80" },
        { label: "En Cours", value: kpis?.atis_en_cours || 0, color: "#60a5fa" },
        { label: "Operateurs", value: kpis?.operateurs_actifs || 0, color: "#c084fc" },
        { label: "Inspections", value: kpis?.inspections_total || 0, color: "#fbbf24" },
        {
          label: "SLA Depasses",
          value: kpis?.sla_overdue || 0,
          color: kpis?.sla_overdue ? "#f87171" : "#4ade80",
        },
      ].map((k) => (
        <div key={k.label} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 800, color: k.color, lineHeight: 1 }}>
            {k.value}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, opacity: 0.7, marginTop: 8 }}>{k.label}</div>
        </div>
      ))}
    </div>,

    // Slide 2: Status
    <div key="status" style={{ textAlign: "center", padding: "0 60px" }}>
      <div style={{ fontSize: 120, marginBottom: 16 }}>{"\U0001F1EC\U0001F1E6"}</div>
      <div style={{ fontSize: 32, fontWeight: 700, opacity: 0.8 }}>
        Plateforme Nationale de Pilotage Industriel
      </div>
      <div style={{ fontSize: 20, opacity: 0.5, marginTop: 12 }}>
        Ministere de l&apos;Industrie et de la Transformation Locale
      </div>
    </div>,

    // Slide 3: Big numbers
    <div key="bignums" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 140, fontWeight: 800, lineHeight: 1 }}>
        {kpis?.atis_approuves || 0}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.7, marginTop: 8 }}>
        Agrements Techniques Delivres
      </div>
      <div style={{ fontSize: 60, fontWeight: 800, marginTop: 32, color: "#4ade80" }}>
        {kpis?.operateurs_actifs || 0}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.6, marginTop: 4 }}>
        Operateurs Industriels Actifs
      </div>
    </div>,
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #051B36 0%, #0C3D5E 50%, #006233 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Manrope, system-ui, sans-serif",
        overflow: "hidden",
        cursor: "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>PNPI</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {time.toLocaleTimeString("fr-FR")}
          </div>
          <div style={{ fontSize: 14, opacity: 0.6 }}>
            {time.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "reveal-up 600ms ease-out",
        }}
      >
        {slides[slideIdx]}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "16px 0",
        }}
      >
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === slideIdx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === slideIdx ? "#fff" : "rgba(255, 255, 255, 0.72)",
              transition: "all 300ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
