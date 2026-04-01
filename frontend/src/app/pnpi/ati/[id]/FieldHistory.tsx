"use client";

import { useState, useEffect } from "react";

interface Change {
  field: string;
  old_value: string | null;
  new_value: string | null;
}

interface HistoryEntry {
  id: string;
  actor: string;
  timestamp: string;
  changes: Change[];
}

const FIELD_LABELS: Record<string, string> = {
  statut: "Statut",
  secteur: "Secteur",
  type_activite: "Type d'activite",
  observations: "Observations",
  instructeur_username: "Instructeur",
  stage: "Etape",
  sla_jours: "SLA (jours)",
};

export function FieldHistory({ atiId }: { atiId: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/pnpi/ati/${atiId}/field-history`)
      .then((r) => r.ok ? r.json() : { history: [] })
      .then((d) => setHistory(d.history || []))
      .catch(() => {});
  }, [atiId, open]);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: "1.5px solid var(--line, #dce4ef)", background: "transparent",
          cursor: "pointer", color: "var(--text-soft, #526175)",
        }}
      >
        {open ? "Masquer" : "Historique des modifications"}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {history.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)" }}>Aucune modification tracee.</p>
          )}
          {history.map((entry) => (
            <div key={entry.id} style={{
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--line, #dce4ef)",
              background: "var(--bg-base, #f4f8fb)", fontSize: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>{entry.actor}</span>
                <span style={{ color: "var(--text-soft, #9ca3af)", fontSize: 11 }}>
                  {new Date(entry.timestamp).toLocaleString("fr-FR")}
                </span>
              </div>
              {entry.changes.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-soft, #526175)" }}>
                    {FIELD_LABELS[c.field] || c.field}
                  </span>
                  <span style={{
                    padding: "1px 6px", borderRadius: 4, fontSize: 10,
                    background: "#fef2f2", color: "#b42318", textDecoration: "line-through",
                  }}>
                    {c.old_value || "\u2014"}
                  </span>
                  <span style={{ color: "var(--text-soft, #9ca3af)" }}>\u2192</span>
                  <span style={{
                    padding: "1px 6px", borderRadius: 4, fontSize: 10,
                    background: "#dcfce7", color: "#006233",
                  }}>
                    {c.new_value || "\u2014"}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
