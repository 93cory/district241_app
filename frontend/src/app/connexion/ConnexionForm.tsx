"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TwoFactorForm } from "./TwoFactorForm";

export const ConnexionForm = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { error?: string; redirect_to?: string; requires_2fa?: boolean; username?: string };

      if (!response.ok) {
        setError(payload.error ?? `Connexion echouee (${response.status}).`);
        setBusy(false);
        return;
      }

      if (payload.requires_2fa) {
        setPendingUsername(payload.username ?? username);
        setRequires2FA(true);
        setBusy(false);
        return;
      }

      router.replace(payload.redirect_to ?? "/");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "0.65rem 0.8rem",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "1rem",
    background: "#fafafa",
  };

  if (requires2FA) {
    return (
      <TwoFactorForm
        username={pendingUsername}
        onBack={() => {
          setRequires2FA(false);
          setPendingUsername("");
        }}
      />
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(135deg, #001f5c 0%, #003F8F 50%, #005f6b 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      overflowY: "auto",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "16px",
            background: "linear-gradient(135deg, #009440, #FFCD00)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem", fontWeight: 900, fontSize: "1.4rem", color: "#003F8F",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}>
            PN
          </div>
          <h1 style={{ color: "white", margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: 800 }}>
            PNPI
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", margin: 0, fontSize: "0.85rem" }}>
            Plateforme Nationale de Pilotage Industriel
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
            Ministere de l&apos;Industrie — Republique Gabonaise
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
          <h2 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "1.1rem", fontWeight: 700 }}>
            Connexion a votre espace
          </h2>
          <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.82rem" }}>
            Acces reserve aux agents habilites du Ministere
          </p>

          <form onSubmit={onSubmit}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
              Identifiant
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Votre nom d'utilisateur"
              autoComplete="username"
              style={inputStyle}
            />
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle}
            />

            {error && (
              <div style={{
                padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: "8px", color: "#b42318", fontSize: "0.82rem", marginBottom: "1rem",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%", padding: "0.75rem",
                background: busy ? "#9ca3af" : "linear-gradient(135deg, #003F8F, #009440)",
                color: "white", border: "none", borderRadius: "8px",
                fontWeight: 700, fontSize: "0.95rem",
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: busy ? "none" : "0 4px 12px rgba(0,63,143,0.35)",
                transition: "all 0.2s",
              }}
            >
              {busy ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          {/* Roles hint */}
          <div style={{
            marginTop: "1.5rem", padding: "0.75rem", background: "#f9fafb",
            borderRadius: "8px", fontSize: "0.72rem", color: "#9ca3af",
          }}>
            <div style={{ fontWeight: 600, marginBottom: "0.3rem", color: "#6b7280" }}>Profils disponibles :</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {["ministre", "directeur", "instructeur", "inspecteur", "operateur", "admin"].map(r => (
                <span key={r} style={{
                  padding: "0.15rem 0.5rem", background: "#e5e7eb",
                  borderRadius: "999px", fontSize: "0.7rem", color: "#374151",
                }}>{r}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginTop: "1.5rem" }}>
          © 2026 Ministere de l&apos;Industrie du Gabon · PNPI v2.0
        </p>
      </div>
    </div>
  );
};
