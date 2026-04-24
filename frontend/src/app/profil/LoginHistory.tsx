"use client";

import { useState, useEffect } from "react";

interface LoginRecord {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  method: string;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

function parseUA(ua: string | null): string {
  if (!ua) return "Inconnu";
  if (ua.includes("Mobile")) return "Mobile";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Navigateur";
}

export function LoginHistory() {
  const [records, setRecords] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me/login-history?limit=15")
      .then((r) => r.json())
      .then((data) => setRecords(data.history || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ fontSize: 13, color: "var(--text-soft, #526175)" }}>Chargement...</p>;

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Historique de connexion</h3>
      {records.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-soft, #526175)" }}>Aucune connexion enregistree.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {records.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 10,
                background: r.success ? "var(--bg-base, #f4f8fb)" : "rgba(180, 35, 24, 0.06)",
                border: `1px solid ${r.success ? "var(--line, #dce4ef)" : "rgba(180, 35, 24, 0.2)"}`,
                fontSize: 13,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: r.success ? "#006233" : "#b42318",
              }} />
              <span style={{ flex: 1 }}>
                <strong>{r.method === "biometric" ? "Biometrie" : "Mot de passe"}</strong>
                {" · "}
                {parseUA(r.user_agent)}
                {r.ip_address && <span style={{ color: "var(--text-soft, #526175)" }}> ({r.ip_address})</span>}
              </span>
              {!r.success && (
                <span style={{ fontSize: 11, color: "#b42318", fontWeight: 600 }}>Echec</span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-soft, #526175)", whiteSpace: "nowrap" }}>
                {new Date(r.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
