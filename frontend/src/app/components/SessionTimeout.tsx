"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_WARNING_MS = 25 * 60 * 1000; // 25 min
const IDLE_LOGOUT_MS = 30 * 60 * 1000;  // 30 min

export function SessionTimeout() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 min = 300s
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setCountdown(300);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(300);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Auto logout
            fetch("/api/auth/logout", { method: "POST" }).then(() => {
              router.push("/connexion");
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_WARNING_MS);

    logoutTimerRef.current = setTimeout(() => {
      fetch("/api/auth/logout", { method: "POST" }).then(() => {
        router.push("/connexion");
      });
    }, IDLE_LOGOUT_MS);
  }, [router]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "mousemove", "touchstart", "scroll"];
    const handler = () => {
      if (!showWarning) resetTimers();
    };

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimers, showWarning]);

  const stayConnected = () => {
    resetTimers();
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      router.push("/connexion");
    });
  };

  if (!showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Expiration de session"
      style={{
        position: "fixed", inset: 0, zIndex: 10001,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 20, padding: "32px",
        maxWidth: 420, width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#9201;</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#0c2a4a" }}>
          Session bientot expiree
        </h3>
        <p style={{ color: "#526175", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
          Votre session expire dans{" "}
          <strong style={{ color: "#b42318", fontSize: 18 }}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </strong>
          <br />Souhaitez-vous rester connecte ?
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={logout}
            style={{
              padding: "10px 20px", border: "1px solid #dce4ef", borderRadius: 12,
              background: "#fff", color: "#526175", fontWeight: 600, cursor: "pointer",
            }}
          >
            Deconnexion
          </button>
          <button
            onClick={stayConnected}
            style={{
              padding: "10px 20px", border: "none", borderRadius: 12,
              background: "#006233", color: "#fff", fontWeight: 600, cursor: "pointer",
            }}
          >
            Rester connecte
          </button>
        </div>
      </div>
    </div>
  );
}
