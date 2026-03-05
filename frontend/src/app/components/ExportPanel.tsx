"use client";

import { IndustrialUnit, SectorIndicator, TraceBatch } from "../../lib/api";

interface Props {
  indicators: SectorIndicator[];
  batches: TraceBatch[];
  units: IndustrialUnit[];
}

const download = (content: string, filename: string, mime = "application/json") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ExportPanel = ({ indicators, batches, units }: Props) => {
  const unitCount = units.length;
  const localTotal = indicators.reduce((sum, entry) => sum + entry.local_volume_tons, 0);
  return (
    <div className="chart-card" style={{ background: "#0f2f64", color: "white" }}>
      <h3 style={{ marginTop: 0, fontWeight: 700 }}>Exports strategiques</h3>
      <p>
        Exportez les indicateurs et lots pour alimenter les rapports ministeriels
        (CSV/JSON/PDF).
      </p>
      <p style={{ margin: "0.75rem 0", color: "#b9c1dd" }}>
        {unitCount} unites industrielles surveillees • {localTotal.toFixed(0)} T local
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a className="cta" href="/api/exports/indicators">
          Exporter CSV secteurs
        </a>
        <button
          className="cta"
          type="button"
          onClick={() =>
            download(JSON.stringify(batches, null, 2), "lots.json", "application/json")
          }
        >
          Exporter lots (JSON)
        </button>
        <a className="cta" href="/api/exports/dashboard-pdf">
          Exporter PDF ministeriel
        </a>
        <a className="cta" href="/api/exports/inspectors-briefing-pdf">
          Exporter PDF inspecteurs
        </a>
        <a className="cta" href="/admin">
          Ouvrir administration
        </a>
        <a className="cta" href="/briefing">
          Briefing ministeriel
        </a>
      </div>
      <style jsx>{`
        .cta {
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: white;
          color: #0b1d3c;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .cta:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};
