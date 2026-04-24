"use client";

import { useState, useEffect, useCallback } from "react";

interface Slide {
  title: string;
  content: React.ReactNode;
}

export default function PresentationPage() {
  const [kpis, setKpis] = useState<any>({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch("/api/pnpi/dashboard/kpis").then((r) => r.json()).then(setKpis).catch(() => {});
  }, []);

  const slides: Slide[] = [
    {
      title: "Plateforme Nationale de la Politique Industrielle",
      content: (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 12 }}>
            Ministere de l&apos;Industrie et de la Transformation Locale
          </div>
          <div style={{
            display: "inline-block", padding: "6px 20px", borderRadius: 20,
            background: "linear-gradient(90deg, #009E60, #FCD116, #003DA5)",
            fontSize: 12, fontWeight: 700, letterSpacing: 1,
          }}>
            REPUBLIQUE GABONAISE
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, margin: "24px 0 8px" }}>PNPI</div>
          <div style={{ fontSize: 16, opacity: 0.8 }}>
            Rapport d&apos;activite · {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </div>
        </div>
      ),
    },
    {
      title: "Indicateurs Cles",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {[
            { label: "ATIs total", value: kpis.atis_total || 0, color: "#0c7eb4" },
            { label: "Approuves", value: kpis.atis_approuves_ce_mois || 0, color: "#006233" },
            { label: "En retard", value: kpis.atis_en_retard || 0, color: "#b42318" },
            { label: "En cours", value: kpis.atis_en_cours || 0, color: "#d97706" },
            { label: "Taux SLA", value: `${kpis.taux_sla_pct || 0}%`, color: "#7c3aed" },
            { label: "Operateurs actifs", value: kpis.operateurs_actifs || 0, color: "#0c7eb4" },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              padding: "20px 24px", borderRadius: 16,
              background: `${kpi.color}12`, border: `2px solid ${kpi.color}30`,
            }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.8 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Performance SLA",
      content: (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#006233" }}>
            {kpis.taux_sla_pct || 0}%
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, opacity: 0.8, marginBottom: 20 }}>
            Taux de respect du SLA
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#b42318" }}>{kpis.atis_en_retard || 0}</div>
              <div style={{ fontSize: 14, opacity: 0.7 }}>Depassements</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#d97706" }}>{kpis.delai_moyen_jours || 0}j</div>
              <div style={{ fontSize: 14, opacity: 0.7 }}>Delai moyen</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Taux de Conformite",
      content: (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#7c3aed" }}>
            {kpis.taux_conformite_pct || 0}%
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, opacity: 0.8, marginBottom: 20 }}>
            Taux de conformite des operateurs inspectes
          </div>
          <div style={{ fontSize: 14, opacity: 0.6 }}>
            Base sur la derniere inspection de chaque operateur
          </div>
        </div>
      ),
    },
    {
      title: "Merci",
      content: (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#127468;&#127462;</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Questions ?
          </div>
          <div style={{ fontSize: 16, opacity: 0.7 }}>
            pnpi-gabon.ga · Plateforme Nationale de la Politique Industrielle
          </div>
        </div>
      ),
    },
  ];

  const next = useCallback(() => setCurrentSlide((s) => Math.min(s + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setCurrentSlide((s) => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        setIsFullscreen(false);
      }
      if (e.key === "f" || e.key === "F") {
        document.documentElement.requestFullscreen?.();
        setIsFullscreen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const slide = slides[currentSlide];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #051B36 0%, #0C7EB4 50%, #006233 100%)",
        color: "#fff", display: "flex", flexDirection: "column",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      {/* Slide */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "40px 60px", maxWidth: 1000, margin: "0 auto", width: "100%",
      }}>
        <h2 style={{
          fontSize: 32, fontWeight: 800, marginBottom: 32,
          textAlign: "center",
        }}>
          {slide.title}
        </h2>
        <div style={{ width: "100%" }}>{slide.content}</div>
      </div>

      {/* Controls */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 32px", background: "rgba(0,0,0,0.2)",
      }}>
        <button onClick={prev} disabled={currentSlide === 0}
          style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", opacity: currentSlide === 0 ? 0.3 : 1 }}>
          &#9664; Precedent
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: 10, height: 10, borderRadius: "50%", border: "none",
                background: i === currentSlide ? "#fff" : "rgba(255, 255, 255, 0.72)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <button onClick={next} disabled={currentSlide === slides.length - 1}
          style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", opacity: currentSlide === slides.length - 1 ? 0.3 : 1 }}>
          Suivant &#9654;
        </button>
      </div>
    </div>
  );
}
