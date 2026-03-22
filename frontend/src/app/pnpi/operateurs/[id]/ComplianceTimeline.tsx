"use client";

import { useState, useEffect } from "react";

interface TimelineEvent {
  date: string; type: string; icon: string;
  title: string; detail: string; color: string;
}

export function ComplianceTimeline({ operateurId }: { operateurId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/pnpi/operateurs/${operateurId}/timeline`)
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(() => {});
  }, [operateurId, open]);

  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
        border: "1.5px solid var(--line, #dce4ef)", background: "transparent",
        cursor: "pointer", color: "var(--text-soft, #526175)",
      }}>
        {open ? "Masquer la timeline" : "Timeline de conformite"}
      </button>

      {open && (
        <div style={{ marginTop: 14, paddingLeft: 20, position: "relative" }}>
          <div style={{
            position: "absolute", left: 7, top: 0, bottom: 0, width: 2,
            background: "var(--line, #dce4ef)",
          }} />

          {events.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)", paddingLeft: 16 }}>
              Aucun evenement.
            </p>
          )}

          {events.map((ev, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 10, paddingLeft: 20 }}>
              <div style={{
                position: "absolute", left: -6, top: 2,
                width: 16, height: 16, borderRadius: "50%",
                background: "var(--bg-layer, #fff)",
                border: `2px solid ${ev.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8,
              }}>
                {ev.icon}
              </div>
              <div style={{
                padding: "8px 12px", borderRadius: 8,
                background: `${ev.color}06`, borderLeft: `3px solid ${ev.color}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: ev.color }}>{ev.title}</span>
                  <span style={{ color: "var(--text-soft, #9ca3af)", fontSize: 10 }}>
                    {new Date(ev.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                {ev.detail && (
                  <div style={{ fontSize: 11, color: "var(--text-soft, #526175)", marginTop: 2 }}>
                    {ev.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
