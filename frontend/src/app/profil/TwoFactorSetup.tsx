"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type SetupState = "idle" | "loading" | "ready" | "confirming" | "enabled" | "error";

export const TwoFactorSetup = () => {
  const [state, setState] = useState<SetupState>("idle");
  const [secret, setSecret] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Check current 2FA status on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.totp_enabled) {
          setIs2FAEnabled(true);
          setState("enabled");
        }
      })
      .catch(() => {});
  }, []);

  const startSetup = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.detail ?? "Erreur lors de la configuration 2FA.");
        setState("error");
        return;
      }

      setSecret(payload.secret);
      setQrSvg(payload.qr_svg);
      setState("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      setState("error");
    }
  }, []);

  const confirmSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setState("confirming");

    try {
      const response = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.detail ?? "Code invalide.");
        setState("ready");
        setBusy(false);
        return;
      }

      setIs2FAEnabled(true);
      setState("enabled");
      setCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      setState("ready");
    } finally {
      setBusy(false);
    }
  };

  const disable2FA = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode.trim() || null }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.detail ?? "Impossible de desactiver la 2FA.");
        setBusy(false);
        return;
      }

      setIs2FAEnabled(false);
      setState("idle");
      setSecret("");
      setQrSvg("");
      setCode("");
      setDisableCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "0.65rem 0.8rem",
    fontSize: "1.2rem",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "1rem",
    background: "#fafafa",
    textAlign: "center",
    letterSpacing: "0.4em",
    fontFamily: "monospace",
  };

  const buttonPrimary: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    background: "linear-gradient(135deg, #003F8F, #009440)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,63,143,0.35)",
    transition: "all 0.2s",
  };

  const buttonDanger: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        maxWidth: "500px",
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
        Authentification a deux facteurs (2FA)
      </h2>
      <p
        style={{
          margin: "0 0 1.5rem",
          color: "#6b7280",
          fontSize: "0.82rem",
        }}
      >
        Protegez votre compte avec un code a usage unique.
      </p>

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

      {/* --- Idle state: show enable button --- */}
      {state === "idle" && (
        <button
          onClick={startSetup}
          style={buttonPrimary}
        >
          Activer la 2FA
        </button>
      )}

      {/* --- Loading --- */}
      {state === "loading" && (
        <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
          Configuration en cours...
        </p>
      )}

      {/* --- QR code displayed, waiting for confirmation --- */}
      {(state === "ready" || state === "confirming") && (
        <div>
          <p
            style={{
              color: "#374151",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            Scannez le QR code ci-dessous avec votre application
            d&apos;authentification (Google Authenticator, Authy, etc.).
          </p>

          {/* QR Code SVG */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1rem",
              padding: "1rem",
              background: "#f9fafb",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
            }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          {/* Manual secret */}
          <div
            style={{
              padding: "0.75rem",
              background: "#f9fafb",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                margin: "0 0 0.3rem",
                fontSize: "0.75rem",
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              Cle secrete (saisie manuelle) :
            </p>
            <code
              style={{
                fontSize: "0.85rem",
                color: "#003F8F",
                fontWeight: 700,
                wordBreak: "break-all",
              }}
            >
              {secret}
            </code>
          </div>

          {/* Confirm code */}
          <form onSubmit={confirmSetup}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "0.35rem",
              }}
            >
              Code de verification
            </label>
            <input
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                setCode(val);
              }}
              required
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              style={{
                ...buttonPrimary,
                background:
                  busy || code.length !== 6
                    ? "#9ca3af"
                    : buttonPrimary.background,
                cursor:
                  busy || code.length !== 6 ? "not-allowed" : "pointer",
                boxShadow:
                  busy || code.length !== 6
                    ? "none"
                    : buttonPrimary.boxShadow,
              }}
            >
              {busy ? "Activation en cours..." : "Confirmer et activer"}
            </button>
          </form>
        </div>
      )}

      {/* --- 2FA enabled state --- */}
      {state === "enabled" && is2FAEnabled && (
        <div>
          <div
            style={{
              padding: "1rem",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#166534",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              2FA activee
            </p>
            <p
              style={{ margin: "0.3rem 0 0", color: "#166534", fontSize: "0.8rem" }}
            >
              Votre compte est protege par l&apos;authentification a deux
              facteurs.
            </p>
          </div>

          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "0.35rem",
            }}
          >
            Code TOTP pour desactiver
          </label>
          <input
            value={disableCode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
              setDisableCode(val);
            }}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            style={inputStyle}
          />
          <button
            onClick={disable2FA}
            disabled={busy || disableCode.length !== 6}
            style={{
              ...buttonDanger,
              opacity: busy || disableCode.length !== 6 ? 0.5 : 1,
              cursor:
                busy || disableCode.length !== 6
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {busy ? "Desactivation..." : "Desactiver 2FA"}
          </button>
        </div>
      )}

      {/* --- Error state with retry --- */}
      {state === "error" && (
        <button
          onClick={startSetup}
          style={buttonPrimary}
        >
          Reessayer
        </button>
      )}
    </div>
  );
};
