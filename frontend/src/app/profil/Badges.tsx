"use client";

import { useState, useEffect } from "react";

interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
  earned: boolean;
}

const CAT_COLORS: Record<string, string> = {
  debutant: "#006233",
  productivite: "#0c7eb4",
  qualite: "#7c3aed",
  terrain: "#d97706",
  diversite: "#059669",
  engagement: "#b42318",
};

export function Badges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earned, setEarned] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me/badges")
      .then((r) => r.json())
      .then((d) => {
        setBadges(d.badges || []);
        setEarned(d.earned || 0);
        setTotal(d.total || 0);
      })
      .catch(() => {});
  }, []);

  if (badges.length === 0) return null;

  const pct = total ? Math.round((earned / total) * 100) : 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Badges</h3>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent, #006233)" }}>
          {earned}/{total} ({pct}%)
        </span>
      </div>

      <div
        style={{ height: 6, borderRadius: 3, background: "var(--line, #e5e7eb)", marginBottom: 14 }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            background: "#006233",
            width: `${pct}%`,
            transition: "width 500ms",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 8,
        }}
      >
        {badges.map((b) => (
          <div
            key={b.id}
            style={{
              padding: "12px 10px",
              borderRadius: 12,
              textAlign: "center",
              background: b.earned
                ? `${CAT_COLORS[b.category] || "#006233"}08`
                : "var(--bg-base, #f4f8fb)",
              border: `1.5px solid ${b.earned ? CAT_COLORS[b.category] || "#006233" : "var(--line, #dce4ef)"}`,
              opacity: b.earned ? 1 : 0.4,
            }}
          >
            <div style={{ fontSize: 28 }}>{b.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{b.name}</div>
            <div style={{ fontSize: 9, color: "var(--text-soft, #9ca3af)", marginTop: 2 }}>
              {b.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
