"use client";

import { useState, useEffect } from "react";
import { useToast } from "../components/Toast";

const PREF_LABELS: Record<string, string> = {
  email_ati_approved: "Email : ATI approuve",
  email_ati_rejected: "Email : ATI rejete",
  email_sla_alert: "Email : Alertes SLA",
  email_inspection: "Email : Inspections terminees",
  email_weekly_briefing: "Email : Briefing hebdomadaire",
  push_enabled: "Notifications push (temps reel)",
};

export function NotificationPreferences() {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me/preferences").then(r => r.json()).then(setPrefs).finally(() => setLoading(false));
  }, []);

  const toggle = (key: string) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) showToast("Preferences enregistrees", "success");
      else showToast("Erreur", "error");
    } catch { showToast("Erreur de connexion", "error"); }
    finally { setSaving(false); }
  };

  if (loading) return <p style={{ color: "var(--text-soft, #526175)", fontSize: 13 }}>Chargement...</p>;

  return (
    <div>
      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700 }}>Preferences de notification</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {Object.entries(PREF_LABELS).map(([key, label]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={prefs[key] ?? true}
              onChange={() => toggle(key)}
              style={{ width: 18, height: 18, accentColor: "#006233" }}
            />
            {label}
          </label>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: "8px 20px", borderRadius: 10, border: "none",
          background: "#006233", color: "#fff", fontWeight: 600,
          cursor: "pointer", opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}
