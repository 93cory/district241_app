"use client";

import { useState, useEffect } from "react";

interface DigestSection { title: string; icon: string; items: string[]; }

export function DailyDigest() {
  const [digest, setDigest] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me/digest").then(r => r.json()).then(setDigest).catch(() => {});
  }, []);

  if (!digest) return null;

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Resume quotidien</h3>
      <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "0 0 12px" }}>
        {digest.date} — {digest.total_events} evenements
      </p>

      {digest.sections.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-soft)" }}>Aucune activite dans les 24 dernieres heures.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {digest.sections.map((s: DigestSection, i: number) => (
            <div key={i} style={{
              padding: "10px 14px", borderRadius: 10,
              background: "var(--bg-base, #f4f8fb)",
              borderLeft: "3px solid var(--accent, #006233)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {s.icon} {s.title}
              </div>
              {s.items.map((item, j) => (
                <div key={j} style={{ fontSize: 12, color: "var(--text-soft)", paddingLeft: 8 }}>{"\u2022"} {item}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
