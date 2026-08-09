"use client";
import { useState, useEffect } from "react";
import { getCurrentUsernameFallback, userScopedStorageKey } from "../../../lib/user-scoped-storage";

interface AlertRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: string;
}

const DEFAULT_RULES: AlertRule[] = [
  {
    id: "ati_approved",
    label: "ATI approuve",
    description: "Notification quand un ATI est approuve",
    enabled: true,
    category: "ATI",
  },
  {
    id: "ati_rejected",
    label: "ATI rejete",
    description: "Notification quand un ATI est rejete",
    enabled: true,
    category: "ATI",
  },
  {
    id: "ati_sla_warning",
    label: "Alerte SLA (80%)",
    description: "Alerte quand un ATI atteint 80% de son delai SLA",
    enabled: true,
    category: "ATI",
  },
  {
    id: "ati_sla_critical",
    label: "SLA depasse",
    description: "Alerte quand un ATI depasse son delai SLA",
    enabled: true,
    category: "ATI",
  },
  {
    id: "ati_assigned",
    label: "ATI assigne",
    description: "Notification quand un ATI vous est assigne",
    enabled: true,
    category: "ATI",
  },
  {
    id: "inspection_scheduled",
    label: "Inspection planifiee",
    description: "Rappel d'inspection a venir",
    enabled: true,
    category: "Inspections",
  },
  {
    id: "inspection_completed",
    label: "Inspection terminee",
    description: "Notification de fin d'inspection",
    enabled: false,
    category: "Inspections",
  },
  {
    id: "weekly_briefing",
    label: "Briefing hebdomadaire",
    description: "Resume hebdomadaire par email chaque lundi",
    enabled: true,
    category: "Rapports",
  },
  {
    id: "monthly_report",
    label: "Rapport mensuel",
    description: "Synthese mensuelle automatique",
    enabled: false,
    category: "Rapports",
  },
  {
    id: "new_operator",
    label: "Nouvel operateur",
    description: "Notification quand un operateur est enregistre",
    enabled: false,
    category: "Operateurs",
  },
  {
    id: "operator_expiry",
    label: "Expiration operateur",
    description: "Alerte 30 jours avant expiration d'un ATI operateur",
    enabled: true,
    category: "Operateurs",
  },
  {
    id: "system_announcement",
    label: "Annonces systeme",
    description: "Mises a jour et maintenance de la plateforme",
    enabled: true,
    category: "Systeme",
  },
];

export default function EmailAlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES);
  const [saved, setSaved] = useState(false);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  const toggle = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    setSaved(false);
  };

  const save = () => {
    // In production this would POST to /api/pnpi/email-alerts/preferences
    const prefs = Object.fromEntries(rules.map((r) => [r.id, r.enabled]));
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    getCurrentUsernameFallback().then((username) =>
      setStorageKey(userScopedStorageKey("pnpi_email_alert_prefs", username)),
    );
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const prefs = JSON.parse(stored);
        setRules((prev) => prev.map((r) => (r.id in prefs ? { ...r, enabled: prefs[r.id] } : r)));
      }
    } catch {}
  }, [storageKey]);

  const categories = Array.from(new Set(rules.map((r) => r.category)));
  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Alertes email personnalisees</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>
            {enabledCount} / {rules.length} alertes actives
          </p>
        </div>
        <button
          onClick={save}
          style={{
            padding: "8px 20px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: saved ? "#006233" : "#051B36",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {saved ? "Enregistre !" : "Enregistrer"}
        </button>
      </div>

      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-soft)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            {cat}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rules
              .filter((r) => r.category === cat)
              .map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => toggle(rule.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--bg-layer, #fff)",
                    cursor: "pointer",
                    border: rule.enabled
                      ? "1.5px solid #006233"
                      : "1.5px solid var(--line, #dce4ef)",
                    opacity: rule.enabled ? 1 : 0.6,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      flexShrink: 0,
                      background: rule.enabled ? "#006233" : "var(--bg-base, #f3f4f6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {rule.enabled ? "\u2713" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{rule.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
                      {rule.description}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
