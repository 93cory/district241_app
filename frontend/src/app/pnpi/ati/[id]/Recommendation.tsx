"use client";

import { useState, useEffect } from "react";

interface SimilarCase { numero_ati: string; statut: string; secteur: string; similarity: number; }

interface RecData {
  recommendation: string; confidence: number; reason: string;
  approve_pct: number; reject_pct: number;
  warnings: string[]; similar_cases: SimilarCase[];
}

const REC_STYLES: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  approuver: { color: "#006233", bg: "#dcfce7", icon: "\u2713", label: "Recommandation : APPROUVER" },
  rejeter: { color: "#b42318", bg: "#fef2f2", icon: "\u2715", label: "Recommandation : REJETER" },
  examen_approfondi: { color: "#d97706", bg: "#fef3c7", icon: "\uD83D\uDD0D", label: "Recommandation : EXAMEN APPROFONDI" },
  indetermine: { color: "#526175", bg: "#f3f4f6", icon: "\u2014", label: "Donnees insuffisantes" },
};

export function Recommendation({ atiId }: { atiId: string }) {
  const [data, setData] = useState<RecData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/pnpi/ati/${atiId}/recommendation`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {});
  }, [atiId, open]);

  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
        border: "1.5px dashed #7c3aed", background: "rgba(124, 58, 237, 0.04)",
        color: "#7c3aed", cursor: "pointer",
      }}>
        {open ? "Masquer" : "\uD83E\uDD16 Aide a la decision"}
      </button>

      {open && data && (() => {
        const style = REC_STYLES[data.recommendation] || REC_STYLES.indetermine;
        return (
          <div style={{ marginTop: 10, padding: "16px 18px", borderRadius: 14, background: style.bg, border: `2px solid ${style.color}25` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: style.color }}>{style.icon} {style.label}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: style.color }}>{data.confidence}%</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-main)", margin: "0 0 10px" }}>{data.reason}</p>

            {/* Approve/Reject gauge */}
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: `${data.approve_pct}%`, background: "#006233" }} />
              <div style={{ width: `${data.reject_pct}%`, background: "#b42318" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 10 }}>
              <span style={{ color: "#006233", fontWeight: 700 }}>Approuver {data.approve_pct}%</span>
              <span style={{ color: "#b42318", fontWeight: 700 }}>Rejeter {data.reject_pct}%</span>
            </div>

            {data.warnings.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>Alertes :</div>
                {data.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#d97706", paddingLeft: 8 }}>\u26A0 {w}</div>
                ))}
              </div>
            )}

            {data.similar_cases.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-soft)", marginBottom: 4 }}>Dossiers similaires :</div>
                {data.similar_cases.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, padding: "2px 0" }}>
                    <span style={{ fontWeight: 600 }}>{c.numero_ati}</span>
                    <span style={{ color: c.statut === "approuve" ? "#006233" : "#b42318", fontWeight: 700 }}>{c.statut}</span>
                    <span style={{ color: "var(--text-soft)" }}>{c.similarity}% similaire</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)", marginTop: 8, fontStyle: "italic" }}>
              Cette recommandation est indicative et basee sur l&apos;analyse statistique des decisions passees.
              La decision finale reste a la discretion de l&apos;instructeur.
            </div>
          </div>
        );
      })()}
    </div>
  );
}
