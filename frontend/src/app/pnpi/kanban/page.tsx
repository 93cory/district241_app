"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

interface ATICard {
  id: string;
  numero_ati: string;
  operateur: string;
  secteur: string;
  age_jours: number;
  sla_jours: number;
  is_overdue: boolean;
}

interface Column {
  id: string;
  label: string;
  color: string;
  items: ATICard[];
}

const COLUMNS_DEF = [
  { id: "soumis", label: "Soumis", color: "#526175" },
  { id: "en_instruction", label: "En instruction", color: "#0c7eb4" },
  { id: "en_validation", label: "En validation", color: "#d97706" },
  { id: "approuve", label: "Approuve", color: "#006233" },
  { id: "rejete", label: "Rejete", color: "#b42318" },
];

export default function KanbanPage() {
  const { showToast } = useToast();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragItem, setDragItem] = useState<{ atiId: string; fromCol: string } | null>(null);

  useEffect(() => {
    fetch("/api/pnpi/ati?limit=200")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const atis = Array.isArray(data) ? data : Array.isArray(data?.atis) ? data.atis : [];
        const cols: Column[] = COLUMNS_DEF.map((def) => ({
          ...def,
          items: atis
            .filter((a: any) => (a.statut || "soumis") === def.id)
            .map((a: any) => ({
              id: a.id,
              numero_ati: a.numero_ati,
              operateur: a.operateur_nom || a.operateur || "",
              secteur: a.secteur || "",
              age_jours: a.age_jours || 0,
              sla_jours: a.sla_jours || 45,
              is_overdue: a.is_overdue || false,
            })),
        }));
        setColumns(cols);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDrop = async (targetColId: string) => {
    if (!dragItem || dragItem.fromCol === targetColId) {
      setDragItem(null);
      return;
    }

    // Optimistic update
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === dragItem.fromCol) {
          return { ...col, items: col.items.filter((i) => i.id !== dragItem.atiId) };
        }
        if (col.id === targetColId) {
          const item = prev
            .find((c) => c.id === dragItem.fromCol)
            ?.items.find((i) => i.id === dragItem.atiId);
          return item ? { ...col, items: [...col.items, item] } : col;
        }
        return col;
      }),
    );

    // API call to update status
    try {
      const res = await fetch(`/api/pnpi/ati/${dragItem.atiId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_statut: targetColId }),
      });
      if (res.ok) {
        showToast("Statut mis a jour", "success");
      } else {
        showToast("Transition non autorisee", "error");
        // Revert · reload
        window.location.reload();
      }
    } catch {
      showToast("Erreur", "error");
    }

    setDragItem(null);
  };

  if (loading) {
    return (
      <div
        style={{ padding: "24px 32px", textAlign: "center", color: "var(--text-soft, #526175)" }}
      >
        Chargement du tableau Kanban...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px", paddingLeft: 12 }}>
        Pipeline ATI · Vue Kanban
      </h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 12,
          minHeight: 500,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
            style={{
              flex: "0 0 240px",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-base, #f4f8fb)",
              borderRadius: 16,
              padding: 10,
              minHeight: 400,
            }}
          >
            {/* Column header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: col.color,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{col.label}</span>
              </div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  background: `${col.color}15`,
                  color: col.color,
                }}
              >
                {col.items.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {col.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragItem({ atiId: item.id, fromCol: col.id })}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-layer, #fff)",
                    border: `1px solid ${item.is_overdue ? "#b4231840" : "var(--line, #dce4ef)"}`,
                    cursor: "grab",
                    fontSize: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.numero_ati}</div>
                  <div style={{ color: "var(--text-soft, #526175)", marginBottom: 4 }}>
                    {item.operateur}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        background: "var(--bg-base, #f4f8fb)",
                      }}
                    >
                      {item.secteur}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: item.is_overdue ? "#b42318" : "var(--text-soft, #9ca3af)",
                      }}
                    >
                      {item.age_jours}j / {item.sla_jours}j
                    </span>
                  </div>
                </div>
              ))}
              {col.items.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--text-soft, #9ca3af)",
                    fontStyle: "italic",
                    border: "2px dashed var(--line, #dce4ef)",
                    borderRadius: 10,
                  }}
                >
                  Deposer ici
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
