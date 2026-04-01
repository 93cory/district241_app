"use client";

import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#dc2626",
        color: "#fff",
        textAlign: "center",
        padding: "0.5rem 1rem",
        fontSize: "0.85rem",
        fontWeight: 600,
      }}
    >
      Vous etes hors ligne. Certaines fonctionnalites peuvent etre indisponibles.
    </div>
  );
}
