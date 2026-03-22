"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

interface Schedule {
  id: string; report_type: string; frequency: string;
  recipients: string[]; format: string; is_active: boolean;
  created_by: string; created_at: string; next_run: string;
}

const TYPE_LABELS: Record<string, string> = {
  executive: "Rapport executif", ati_summary: "Resume ATI",
  inspections: "Inspections", performance: "Performance", benchmark: "Benchmark",
};

const FREQ_LABELS: Record<string, string> = {
  daily: "Quotidien", weekly: "Hebdomadaire", monthly: "Mensuel",
};

export default function ScheduledReportsPage() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [reportType, setReportType] = useState("executive");
  const [frequency, setFrequency] = useState("weekly");
  const [format, setFormat] = useState("pdf");
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/scheduled-reports/list").then(r => r.json()).then(d => setSchedules(d.schedules || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    const res = await fetch("/api/scheduled-reports/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_type: reportType, frequency, format }),
    });
    if (res.ok) { showToast("Planification creee", "success"); load(); }
    else showToast("Erreur", "error");
    setCreating(false);
  };

  const toggle = async (id: string) => {
    await fetch(`/api/scheduled-reports/${id}/toggle`, { method: "PATCH" });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/scheduled-reports/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Rapports planifies</h1>

      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Nouvelle planification</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <select value={reportType} onChange={e => setReportType(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={frequency} onChange={e => setFrequency(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}>
            {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={format} onChange={e => setFormat(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}>
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
          </select>
          <button onClick={create} disabled={creating} style={{
            padding: "8px 18px", borderRadius: 10, border: "none",
            background: "#006233", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>{creating ? "..." : "Planifier"}</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {schedules.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-soft)" }}>Aucune planification.</div>
        )}
        {schedules.map(s => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 12,
            background: "var(--bg-layer, #fff)", border: "1px solid var(--line)",
            opacity: s.is_active ? 1 : 0.5,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{TYPE_LABELS[s.report_type] || s.report_type}</div>
              <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
                {FREQ_LABELS[s.frequency]} &mdash; {s.format.toUpperCase()} &mdash; par {s.created_by}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)" }}>
                Prochaine execution : {new Date(s.next_run).toLocaleString("fr-FR")}
              </div>
            </div>
            <button onClick={() => toggle(s.id)} style={{
              padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
              background: s.is_active ? "#dcfce7" : "#f3f4f6",
              color: s.is_active ? "#006233" : "#526175", cursor: "pointer",
            }}>{s.is_active ? "Actif" : "Pause"}</button>
            <button onClick={() => remove(s.id)} style={{
              padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
              background: "#fef2f2", color: "#b42318", cursor: "pointer",
            }}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
}
