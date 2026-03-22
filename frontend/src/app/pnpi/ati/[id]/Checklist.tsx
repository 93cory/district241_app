"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../../components/Toast";

interface CheckItem {
  id: string; label: string; category: string;
  is_checked: boolean; checked_by: string | null;
  checked_at: string | null; notes: string | null;
}

const CAT_COLORS: Record<string, string> = {
  Documents: "#0c7eb4", Technique: "#006233",
  Environnement: "#059669", Conformite: "#7c3aed",
  Finance: "#d97706", Specifique: "#b42318",
};

export function Checklist({ atiId }: { atiId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<CheckItem[]>([]);
  const [total, setTotal] = useState(0);
  const [checked, setChecked] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/checklists/ati/${atiId}`)
      .then(r => r.json())
      .then(d => {
        setItems(d.items || []);
        setTotal(d.total || 0);
        setChecked(d.checked || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [atiId]);

  const toggle = async (itemId: string, isChecked: boolean) => {
    await fetch(`/api/checklists/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_checked: !isChecked }),
    });
    load();
  };

  const generate = async () => {
    const res = await fetch(`/api/checklists/ati/${atiId}/generate`, { method: "POST" });
    if (res.ok) { showToast("Checklist generee", "success"); load(); }
    else showToast("Erreur ou checklist existante", "warning");
  };

  const pct = total ? Math.round((checked / total) * 100) : 0;
  const pctColor = pct >= 80 ? "#006233" : pct >= 50 ? "#d97706" : "#b42318";

  // Group by category
  const groups: Record<string, CheckItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }

  if (loading) return <p style={{ fontSize: 13, color: "var(--text-soft)" }}>Chargement...</p>;

  if (total === 0) {
    return (
      <div style={{ textAlign: "center", padding: 16 }}>
        <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 8 }}>Aucune checklist.</p>
        <button onClick={generate} style={{
          padding: "8px 16px", borderRadius: 10, border: "none",
          background: "#006233", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer",
        }}>Generer la checklist</button>
      </div>
    );
  }

  return (
    <div>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--line, #e5e7eb)" }}>
          <div style={{ height: "100%", borderRadius: 4, background: pctColor, width: `${pct}%`, transition: "width 300ms" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: pctColor }}>{pct}%</span>
        <span style={{ fontSize: 11, color: "var(--text-soft)" }}>{checked}/{total}</span>
      </div>

      {/* Items by category */}
      {Object.entries(groups).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: CAT_COLORS[cat] || "#526175",
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
          }}>{cat}</div>
          {catItems.map(item => (
            <label key={item.id} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "6px 0", cursor: "pointer", fontSize: 13,
              opacity: item.is_checked ? 0.7 : 1,
            }}>
              <input
                type="checkbox"
                checked={item.is_checked}
                onChange={() => toggle(item.id, item.is_checked)}
                style={{ marginTop: 2, accentColor: CAT_COLORS[cat] || "#006233" }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ textDecoration: item.is_checked ? "line-through" : "none" }}>
                  {item.label}
                </span>
                {item.checked_by && (
                  <span style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)", marginLeft: 6 }}>
                    ({item.checked_by})
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
