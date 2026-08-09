"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PNPILogo } from "../components/PNPILogo";
import { TwoFactorForm } from "./TwoFactorForm";

export const ConnexionForm = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const payload = (await response.json()) as {
        error?: string;
        redirect_to?: string;
        requires_2fa?: boolean;
        username?: string;
      };

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
    <div className="pnpi-login-root">
      {/* Bande drapeau gabonais en haut */}
      <div className="pnpi-flag-band" aria-hidden="true">
        <div className="flag-green" />
        <div className="flag-yellow" />
        <div className="flag-blue" />
      </div>

      <div className="pnpi-login-container">
        {/* En-tete institutionnel avec logo officiel PNPI */}
        <header className="pnpi-login-header">
          <div className="pnpi-logo-circle">
            <PNPILogo size={112} priority />
          </div>
          <h1 className="pnpi-login-title">PNPI</h1>
          <p className="pnpi-login-subtitle">Plateforme Nationale de Pilotage Industriel</p>
          <p className="pnpi-login-institution">
            Republique Gabonaise · Ministere de l&apos;Industrie
          </p>
          <p className="pnpi-login-baseline">
            L&apos;outil souverain de pilotage industriel du Gabon. Agrements, inspections,
            cartographie et indicateurs ministeriels en un seul espace.
          </p>
        </header>

        {/* Carte de connexion glassmorphism */}
        <div className="pnpi-login-card">
          <div className="pnpi-card-accent" aria-hidden="true" />

          <h2 className="pnpi-card-title">Connexion a votre espace securise</h2>
          <p className="pnpi-card-description">
            Acces reserve aux agents dument habilites par le Ministere.
          </p>

          <form onSubmit={onSubmit} className="pnpi-login-form" noValidate>
            <div className="pnpi-field">
              <label htmlFor="login-username" className="pnpi-label">
                Identifiant
              </label>
              <div className="pnpi-input-wrapper">
                <svg
                  className="pnpi-field-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="login-username"
                  name="username"
                  className="pnpi-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Saisissez votre nom d'utilisateur"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="pnpi-field">
              <label htmlFor="login-password" className="pnpi-label">
                Mot de passe
              </label>
              <div className="pnpi-input-wrapper">
                <svg
                  className="pnpi-field-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="login-password"
                  name="password"
                  className="pnpi-input pnpi-input-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Saisissez votre mot de passe"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pnpi-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  title={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="pnpi-error" role="alert">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`pnpi-submit-btn ${busy ? "busy" : ""}`}
            >
              {busy ? (
                <>
                  <span className="pnpi-spinner" aria-hidden="true" />
                  Connexion en cours...
                </>
              ) : (
                <>Se connecter en toute securite</>
              )}
            </button>
          </form>

          <div className="pnpi-profiles-hint">
            <div className="pnpi-profiles-title">Profils habilites</div>
            <div className="pnpi-profiles-list">
              {["ministre", "directeur", "instructeur", "inspecteur", "operateur", "admin"].map(
                (r) => (
                  <span key={r} className="pnpi-profile-badge">
                    {r}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <footer className="pnpi-login-footer">
          <p>© 2026 Ministere de l&apos;Industrie du Gabon · PNPI v2.0</p>
          <p className="pnpi-footer-slogan">
            Souverainete numerique au service du developpement industriel
          </p>
        </footer>
      </div>
    </div>
  );
};
