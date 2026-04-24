"use client";

import { useState, useEffect } from "react";

interface Objective {
  id: string;
  label: string;
  target: number;
  current: number;
  unit: string;
}

const STORAGE_KEY = "pnpi_objectives";

const DEFAULT_OBJECTIVES: Objective[] = [
  {
    id: "obj-dossiers",
    label: "Dossiers traites par mois",
    target: 15,
    current: 0,
    unit: "dossiers",
  },
  { id: "obj-delai", label: "Delai moyen de traitement", target: 30, current: 0, unit: "jours" },
  { id: "obj-approbation", label: "Taux d'approbation", target: 75, current: 0, unit: "%" },
  {
    id: "obj-inspections",
    label: "Inspections realisees",
    target: 10,
    current: 0,
    unit: "inspections",
  },
];

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setObjectives(JSON.parse(saved));
      } catch {
        setObjectives([...DEFAULT_OBJECTIVES]);
      }
    } else {
      setObjectives([...DEFAULT_OBJECTIVES]);
    }
  }, []);

  const save = (objs: Objective[]) => {
    setObjectives(objs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(objs));
  };

  const updateTarget = (id: string, target: number) => {
    save(objectives.map((o) => (o.id === id ? { ...o, target } : o)));
  };

  const updateCurrent = (id: string, current: number) => {
    save(objectives.map((o) => (o.id === id ? { ...o, current } : o)));
  };

  const addObjective = () => {
    const newObj: Objective = {
      id: `obj-${Date.now()}`,
      label: "Nouvel objectif",
      target: 10,
      current: 0,
      unit: "unites",
    };
    save([...objectives, newObj]);
  };

  const removeObjective = (id: string) => {
    save(objectives.filter((o) => o.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    save(objectives.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Mes objectifs</h1>
          <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: 0 }}>
            Definissez et suivez vos KPIs personnels.
          </p>
        </div>
        <button
          onClick={addObjective}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Objectif
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {objectives.map((obj) => {
          const pct = obj.target > 0 ? Math.min((obj.current / obj.target) * 100, 100) : 0;
          const isInverse = obj.label.toLowerCase().includes("delai"); // Lower is better
          const isGood = isInverse ? obj.current <= obj.target : obj.current >= obj.target;
          const color =
            pct >= 100
              ? isInverse
                ? isGood
                  ? "#006233"
                  : "#b42318"
                : "#006233"
              : pct >= 60
                ? "#d97706"
                : "#b42318";

          return (
            <div key={obj.id} className="chart-card" style={{ padding: "16px 20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <input
                  defaultValue={obj.label}
                  onBlur={(e) => updateLabel(obj.id, e.target.value)}
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    flex: 1,
                  }}
                />
                <button
                  onClick={() => removeObjective(obj.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-soft, #9ca3af)",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>
                    Actuel
                  </label>
                  <input
                    type="number"
                    value={obj.current}
                    onChange={(e) => updateCurrent(obj.id, Number(e.target.value))}
                    style={{
                      display: "block",
                      width: 70,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--line, #dce4ef)",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>
                    Objectif
                  </label>
                  <input
                    type="number"
                    value={obj.target}
                    onChange={(e) => updateTarget(obj.id, Number(e.target.value))}
                    style={{
                      display: "block",
                      width: 70,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--line, #dce4ef)",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 14 }}>
                  {obj.unit}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 24, fontWeight: 800, color }}>{Math.round(pct)}%</span>
              </div>

              <div style={{ height: 8, borderRadius: 4, background: "var(--line, #e5e7eb)" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 4,
                    background: color,
                    width: `${pct}%`,
                    transition: "width 300ms ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
