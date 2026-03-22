"use client";
import { useState } from "react";

const SECTORS = [
  { id: "bois", label: "Bois & Forets", roi_mult: 1.8, jobs_per_mfcfa: 0.06, tax_rate: 25 },
  { id: "mines", label: "Mines & Metaux", roi_mult: 2.5, jobs_per_mfcfa: 0.02, tax_rate: 30 },
  { id: "agroalimentaire", label: "Agroalimentaire", roi_mult: 1.5, jobs_per_mfcfa: 0.08, tax_rate: 20 },
  { id: "peche", label: "Peche", roi_mult: 1.6, jobs_per_mfcfa: 0.07, tax_rate: 22 },
  { id: "btp", label: "BTP & Construction", roi_mult: 2.0, jobs_per_mfcfa: 0.04, tax_rate: 25 },
  { id: "energie", label: "Energie", roi_mult: 3.0, jobs_per_mfcfa: 0.01, tax_rate: 28 },
  { id: "chimie", label: "Chimie", roi_mult: 2.2, jobs_per_mfcfa: 0.03, tax_rate: 27 },
];

export default function ROISimulatorPage() {
  const [sector, setSector] = useState(SECTORS[0]);
  const [investissement, setInvestissement] = useState(500);
  const [duree, setDuree] = useState(5);
  const [zerp, setZerp] = useState(false);

  const taxRate = zerp ? 0 : sector.tax_rate;
  const revenuBrut = investissement * sector.roi_mult;
  const impots = revenuBrut * taxRate / 100;
  const revenuNet = revenuBrut - impots;
  const roi = ((revenuNet - investissement) / investissement * 100);
  const roiAnnuel = roi / duree;
  const emplois = Math.round(investissement * sector.jobs_per_mfcfa);
  const payback = roi > 0 ? Math.round(investissement / (revenuNet / duree) * 10) / 10 : 0;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Simulateur ROI</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Estimez le retour sur investissement de votre projet industriel au Gabon.
      </p>

      {/* Inputs */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Secteur</label>
            <select value={sector.id} onChange={e => setSector(SECTORS.find(s => s.id === e.target.value) || SECTORS[0])}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}>
              {SECTORS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Investissement (M FCFA)</label>
            <input type="number" value={investissement} onChange={e => setInvestissement(Number(e.target.value))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Duree (annees)</label>
            <input type="range" min={1} max={15} value={duree} onChange={e => setDuree(Number(e.target.value))}
              style={{ width: "100%" }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{duree} ans</span>
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginTop: 20 }}>
              <input type="checkbox" checked={zerp} onChange={e => setZerp(e.target.checked)} style={{ accentColor: "#006233" }} />
              Zone ZERP (0% impot 10 ans)
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "ROI total", value: `${roi.toFixed(1)}%`, color: roi >= 0 ? "#006233" : "#b42318" },
          { label: "ROI annuel", value: `${roiAnnuel.toFixed(1)}%`, color: "#0c7eb4" },
          { label: "Revenu net", value: `${revenuNet.toFixed(0)} M`, color: "#006233" },
          { label: "Impots", value: `${impots.toFixed(0)} M (${taxRate}%)`, color: "#d97706" },
          { label: "Emplois crees", value: `${emplois}`, color: "#7c3aed" },
          { label: "Payback", value: `${payback} ans`, color: "#0c7eb4" },
        ].map(k => (
          <div key={k.label} className="chart-card" style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Visual */}
      <div className="chart-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Projection sur {duree} ans</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {Array.from({ length: duree }, (_, i) => {
            const yearRevenu = (revenuNet / duree) * (i + 1);
            const max = revenuNet;
            const h = max ? (yearRevenu / max) * 100 : 0;
            const aboveInvest = yearRevenu >= investissement;
            return (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 8, fontWeight: 700, marginBottom: 2 }}>{yearRevenu.toFixed(0)}M</div>
                <div style={{ height: h, background: aboveInvest ? "#006233" : "#0c7eb4", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
                <div style={{ fontSize: 9, color: "var(--text-soft)", marginTop: 2 }}>An {i + 1}</div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: "2px dashed #b42318", marginTop: 4, position: "relative" }}>
          <span style={{ position: "absolute", right: 0, top: -14, fontSize: 9, color: "#b42318", fontWeight: 700 }}>Investissement: {investissement}M</span>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-soft)", fontStyle: "italic", textAlign: "center" }}>
        Simulation indicative basee sur des multiplicateurs sectoriels moyens. Les resultats reels dependent de nombreux facteurs.
      </div>
    </div>
  );
}
