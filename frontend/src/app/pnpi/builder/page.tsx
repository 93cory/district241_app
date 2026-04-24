"use client";
import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

interface Widget { id: string; type: string; title: string; endpoint: string; size: "small" | "medium" | "large"; }

const WIDGET_CATALOG: { type: string; label: string; endpoint: string; defaultSize: "small" | "medium" | "large" }[] = [
  { type: "kpi", label: "KPI unique", endpoint: "/api/pnpi/dashboard/kpis", defaultSize: "small" },
  { type: "chart", label: "Graphique barres", endpoint: "/api/reports/builder?metric=atis&group_by=secteur", defaultSize: "medium" },
  { type: "table", label: "Tableau donnees", endpoint: "/api/reports/builder?metric=atis&group_by=mois", defaultSize: "large" },
  { type: "stat", label: "Statistique", endpoint: "/api/pnpi/dashboard/kpis", defaultSize: "small" },
  { type: "alerts", label: "Alertes", endpoint: "/api/pnpi/dashboard/smart-alerts", defaultSize: "medium" },
  { type: "quality", label: "Qualite donnees", endpoint: "/api/pnpi/dashboard/data-quality", defaultSize: "small" },
];

const STORAGE_KEY = "pnpi_custom_dashboard";

export default function BuilderPage() {
  const { showToast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setWidgets(JSON.parse(saved)); } catch {}
  }, []);

  useEffect(() => {
    widgets.forEach(w => {
      if (!widgetData[w.id]) {
        fetch(w.endpoint).then(r => r.json()).then(d => setWidgetData(prev => ({ ...prev, [w.id]: d }))).catch(() => {});
      }
    });
  }, [widgets]);

  const save = (ws: Widget[]) => { setWidgets(ws); localStorage.setItem(STORAGE_KEY, JSON.stringify(ws)); };

  const addWidget = (catalog: typeof WIDGET_CATALOG[0]) => {
    const w: Widget = { id: `w-${Date.now()}`, type: catalog.type, title: catalog.label, endpoint: catalog.endpoint, size: catalog.defaultSize };
    save([...widgets, w]);
    showToast("Widget ajoute", "success");
  };

  const removeWidget = (id: string) => { save(widgets.filter(w => w.id !== id)); };

  const gridCols: Record<string, string> = { small: "1", medium: "2", large: "3" };

  const renderWidget = (w: Widget) => {
    const data = widgetData[w.id];
    if (!data) return <div style={{ padding: 20, textAlign: "center", color: "var(--text-soft)", fontSize: 12 }}>Chargement...</div>;

    if (w.type === "kpi" || w.type === "stat") {
      const val = data.atis_total || data.global_score || "·";
      return <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 800, color: "#006233" }}>{val}</div></div>;
    }
    if (w.type === "alerts") {
      const alerts = data.alerts || [];
      return <div>{alerts.slice(0, 3).map((a: any, i: number) => <div key={i} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--line, #eee)" }}>{a.title}</div>)}</div>;
    }
    if (w.type === "chart" || w.type === "table") {
      const rows = data.data || [];
      return (
        <div style={{ fontSize: 11 }}>
          {rows.slice(0, 5).map((r: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid var(--line, #eee)" }}>
              <span>{r.group || r._row || `#${i}`}</span>
              <span style={{ fontWeight: 700 }}>{r.total || r.count || "·"}</span>
            </div>
          ))}
        </div>
      );
    }
    if (w.type === "quality") {
      return <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 800, color: "#006233" }}>{data.grade || "·"}</div><div style={{ fontSize: 11 }}>{data.global_score}%</div></div>;
    }
    return <pre style={{ fontSize: 9, overflow: "auto" }}>{JSON.stringify(data, null, 2).slice(0, 200)}</pre>;
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Mon tableau de bord</h1>
        <button onClick={() => setEditing(!editing)} style={{
          padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--line)", background: editing ? "#006233" : "var(--bg-layer)", color: editing ? "#fff" : "var(--text-soft)", fontWeight: 600, fontSize: 12, cursor: "pointer",
        }}>{editing ? "Terminer" : "Modifier"}</button>
      </div>

      {editing && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {WIDGET_CATALOG.map(c => (
            <button key={c.type} onClick={() => addWidget(c)} style={{
              padding: "6px 12px", borderRadius: 8, border: "1px dashed var(--line)", background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>+ {c.label}</button>
          ))}
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="chart-card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎨</div>
          <div style={{ fontWeight: 700 }}>Dashboard vide</div>
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>Cliquez "Modifier" pour ajouter des widgets.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {widgets.map(w => (
            <div key={w.id} style={{ gridColumn: `span ${gridCols[w.size]}`, position: "relative" }} className="chart-card">
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{w.title}</div>
                {renderWidget(w)}
              </div>
              {editing && (
                <button onClick={() => removeWidget(w.id)} style={{
                  position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#b42318", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
