"use client";
import { useState, useEffect } from "react";

export default function MobileDashPage() {
  const [kpis, setKpis] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pnpi/dashboard/kpis")
      .then((r) => r.json())
      .then(setKpis)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div style={{ padding: 24, textAlign: "center", fontSize: 14 }}>Chargement...</div>;

  const cards = [
    { label: "ATIs", value: kpis.atis_total || 0, color: "#051B36", icon: "\uD83D\uDCCB" },
    { label: "Approuves", value: kpis.atis_approuves || 0, color: "#006233", icon: "\u2705" },
    { label: "En cours", value: kpis.atis_en_cours || 0, color: "#0c7eb4", icon: "\u23F3" },
    { label: "Rejetes", value: kpis.atis_rejetes || 0, color: "#b42318", icon: "\u274C" },
    {
      label: "Operateurs",
      value: kpis.operateurs_actifs || 0,
      color: "#7c3aed",
      icon: "\uD83C\uDFED",
    },
    {
      label: "Inspections",
      value: kpis.inspections_total || 0,
      color: "#059669",
      icon: "\uD83D\uDD0D",
    },
  ];

  const quickLinks = [
    { href: "/pnpi/ati", label: "Mes ATI", icon: "\uD83D\uDCCB" },
    { href: "/pnpi/kanban", label: "Kanban", icon: "\uD83D\uDCCC" },
    { href: "/pnpi/messages", label: "Messages", icon: "\uD83D\uDCAC" },
    { href: "/pnpi/calendar", label: "Calendrier", icon: "\uD83D\uDCC5" },
    { href: "/pnpi/search", label: "Recherche", icon: "\uD83D\uDD0E" },
    { href: "/pnpi/notes", label: "Notes", icon: "\uD83D\uDCDD" },
    { href: "/pnpi/favorites", label: "Favoris", icon: "\u2B50" },
    { href: "/profil", label: "Profil", icon: "\uD83D\uDC64" },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>PNPI</div>
        <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Tableau de bord mobile</div>
      </div>

      {/* KPIs 2x3 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              padding: "14px 12px",
              borderRadius: 14,
              textAlign: "center",
              background: "var(--bg-layer, #fff)",
              border: `1.5px solid ${c.color}15`,
            }}
          >
            <div style={{ fontSize: 16 }}>{c.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Acces rapide</div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}
      >
        {quickLinks.map((l) => (
          <a
            key={l.href}
            href={l.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "12px 4px",
              borderRadius: 12,
              background: "var(--bg-layer, #fff)",
              border: "1px solid var(--line, #dce4ef)",
              textDecoration: "none",
              color: "var(--text-main)",
            }}
          >
            <span style={{ fontSize: 22 }}>{l.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 600, textAlign: "center" }}>{l.label}</span>
          </a>
        ))}
      </div>

      {/* SLA alert */}
      {(kpis.sla_overdue || 0) > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fef2f2",
            borderLeft: "4px solid #b42318",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#b42318" }}>
            {"\uD83D\uDEA8"} {kpis.sla_overdue} ATI en depassement SLA
          </div>
          <a href="/pnpi/triage" style={{ fontSize: 11, color: "#b42318", fontWeight: 600 }}>
            {"Voir la file de triage \u2192"}
          </a>
        </div>
      )}
    </div>
  );
}
