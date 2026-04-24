"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface TwoFactorFormProps {
  username: string;
  onBack: () => void;
}

export const TwoFactorForm = ({ username, onBack }: TwoFactorFormProps) => {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("totp_code", code.trim());

      const response = await fetch("/api/auth/token-2fa", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        redirect_to?: string;
      };

      if (!response.ok) {
        setError(payload.detail ?? payload.error ?? `Verification echouee (${response.status}).`);
        setBusy(false);
        return;
      }

      // 2FA verified, cookies set by API route · complete login
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
    fontSize: "1.4rem",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "1rem",
    background: "#fafafa",
    textAlign: "center",
    letterSpacing: "0.5em",
    fontFamily: "monospace",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "linear-gradient(135deg, #001f5c 0%, #003F8F 50%, #005f6b 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #009440, #FFCD00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontWeight: 900,
              fontSize: "1.4rem",
              color: "#003F8F",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            PN
          </div>
          <h1
            style={{
              color: "white",
              margin: "0 0 0.3rem",
              fontSize: "1.5rem",
              fontWeight: 800,
            }}
          >
            PNPI
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              margin: 0,
              fontSize: "0.85rem",
            }}
          >
            Verification en deux etapes
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <h2
            style={{
              margin: "0 0 0.25rem",
              color: "#003F8F",
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            Code de verification
          </h2>
          <p
            style={{
              margin: "0 0 1.5rem",
              color: "#6b7280",
              fontSize: "0.82rem",
            }}
          >
            Saisissez le code a 6 chiffres de votre application
            d&apos;authentification.
          </p>

          <form onSubmit={onSubmit}>
            <input
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                setCode(val);
              }}
              required
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              inputMode="numeric"
              style={inputStyle}
            />

            {error && (
              <div
                style={{
                  padding: "0.65rem 0.9rem",
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "8px",
                  color: "#b42318",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              style={{
                width: "100%",
                padding: "0.75rem",
                background:
                  busy || code.length !== 6
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #003F8F, #009440)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor:
                  busy || code.length !== 6 ? "not-allowed" : "pointer",
                boxShadow:
                  busy || code.length !== 6
                    ? "none"
                    : "0 4px 12px rgba(0,63,143,0.35)",
                transition: "all 0.2s",
              }}
            >
              {busy ? "Verification en cours..." : "Verifier"}
            </button>
          </form>

          <button
            onClick={onBack}
            disabled={busy}
            style={{
              width: "100%",
              padding: "0.6rem",
              marginTop: "0.75rem",
              background: "transparent",
              color: "#003F8F",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: busy ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            Retour
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.72)",
            fontSize: "0.7rem",
            marginTop: "1.5rem",
          }}
        >
          &copy; 2026 Ministere de l&apos;Industrie du Gabon &middot; PNPI v2.0
        </p>
      </div>
    </div>
  );
};
