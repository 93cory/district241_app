"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";
import { getCurrentUsernameFallback, userScopedStorageKey } from "../../../lib/user-scoped-storage";

interface WidgetConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "kpi_summary", label: "Resume KPIs", enabled: true, order: 0 },
  { id: "pipeline_chart", label: "Pipeline ATI", enabled: true, order: 1 },
  { id: "sector_chart", label: "Repartition sectorielle", enabled: true, order: 2 },
  { id: "trend_chart", label: "Tendances mensuelles", enabled: true, order: 3 },
  { id: "carte_operateurs", label: "Carte des operateurs", enabled: true, order: 4 },
  { id: "recent_atis", label: "ATIs recents", enabled: true, order: 5 },
  { id: "alerts", label: "Alertes prioritaires", enabled: true, order: 6 },
  { id: "sla_metrics", label: "Metriques SLA", enabled: true, order: 7 },
  { id: "province_breakdown", label: "Repartition provinciale", enabled: true, order: 8 },
  { id: "scoring_ranking", label: "Classement operateurs", enabled: false, order: 9 },
];

const STORAGE_KEY = "pnpi_dashboard_config";

export default function DashboardConfigPage() {
  const { showToast } = useToast();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUsernameFallback().then((username) =>
      setStorageKey(userScopedStorageKey(STORAGE_KEY, username)),
    );
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        // Merge with defaults to pick up new widgets
        const merged = DEFAULT_WIDGETS.map((dw) => {
          const found = parsed.find((p) => p.id === dw.id);
          return found ? { ...dw, enabled: found.enabled, order: found.order } : dw;
        });
        merged.sort((a, b) => a.order - b.order);
        setWidgets(merged);
      } catch {
        setWidgets([...DEFAULT_WIDGETS]);
      }
    } else {
      setWidgets([...DEFAULT_WIDGETS]);
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)));
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setWidgets((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  };

  const moveDown = (idx: number) => {
    if (idx >= widgets.length - 1) return;
    setWidgets((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  };

  const save = () => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(widgets));
    showToast("Configuration du dashboard enregistree", "success");
  };

  const reset = () => {
    setWidgets([...DEFAULT_WIDGETS]);
    if (storageKey) localStorage.removeItem(storageKey);
    showToast("Configuration reinitalisee", "info");
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
        Configuration du Dashboard
      </h1>
      <p
        style={{
          color: "var(--text-soft, #526175)",
          fontSize: 14,
          margin: "0 0 24px",
        }}
      >
        Activez, desactivez ou reordonnez les widgets de votre tableau de bord.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {widgets.map((w, idx) => (
          <div
            key={w.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdx === null || dragIdx === idx) return;
              setWidgets((prev) => {
                const next = [...prev];
                const [item] = next.splice(dragIdx, 1);
                next.splice(idx, 0, item);
                return next.map((wi, i) => ({ ...wi, order: i }));
              });
              setDragIdx(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 12,
              background: w.enabled ? "var(--bg-layer, #fff)" : "var(--bg-base, #f4f8fb)",
              border: `1.5px solid ${w.enabled ? "var(--accent, #006233)" : "var(--line, #dce4ef)"}`,
              opacity: w.enabled ? 1 : 0.6,
              cursor: "grab",
              transition: "all 150ms ease",
            }}
          >
            <span style={{ fontSize: 16, color: "var(--text-soft, #526175)", cursor: "grab" }}>
              ⠿
            </span>
            <input
              type="checkbox"
              checked={w.enabled}
              onChange={() => toggle(w.id)}
              style={{ width: 18, height: 18, accentColor: "#006233" }}
            />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{w.label}</span>
            <button
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                opacity: idx === 0 ? 0.3 : 1,
              }}
              aria-label="Monter"
            >
              ▲
            </button>
            <button
              onClick={() => moveDown(idx)}
              disabled={idx === widgets.length - 1}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                opacity: idx === widgets.length - 1 ? 0.3 : 1,
              }}
              aria-label="Descendre"
            >
              ▼
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={save}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Enregistrer
        </button>
        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            border: "1.5px solid var(--line, #dce4ef)",
            background: "transparent",
            color: "var(--text-soft, #526175)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reinitialiser
        </button>
      </div>
    </div>
  );
}
