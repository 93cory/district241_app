"use client";

import { useState, useEffect } from "react";

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already installed
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!isStandalone) setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, right: 16,
      zIndex: 9998, maxWidth: 420, margin: "0 auto",
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", borderRadius: 14,
      background: "var(--bg-layer, #fff)",
      border: "1.5px solid var(--accent, #006233)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      animation: "reveal-up 300ms ease-out",
    }}>
      <div style={{ fontSize: 28 }}>📲</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Installer PNPI</div>
        <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
          Acces rapide hors-ligne depuis votre ecran d'accueil
        </div>
      </div>
      <button
        onClick={install}
        style={{
          padding: "8px 16px", borderRadius: 10, border: "none",
          background: "#006233", color: "#fff", fontWeight: 700,
          fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        Installer
      </button>
      <button
        onClick={() => setShowBanner(false)}
        style={{
          background: "none", border: "none", color: "var(--text-soft, #526175)",
          cursor: "pointer", fontSize: 18, padding: 4,
        }}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
