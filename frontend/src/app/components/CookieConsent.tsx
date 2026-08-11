"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "pnpi_cookie_consent";

export function CookieConsent() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setShow(false);
  };
  const decline = () => {
    localStorage.setItem(STORAGE_KEY, "declined");
    setShow(false);
  };

  // Masque sur /pnpi/presentation : le bandeau pleine largeur (bottom:0,
  // z-index 9996) peut s'afficher par-dessus le contenu au tout premier
  // chargement d'une presentation ministerielle plein ecran — mauvais
  // effet en reunion officielle. Le consentement reste demande normalement
  // sur toutes les autres pages ; rien n'est contourne, juste reporte.
  if (pathname === "/pnpi/presentation") return null;

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9996,
        padding: "14px 24px",
        background: "var(--bg-layer, #fff)",
        borderTop: "1.5px solid var(--line, #dce4ef)",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Cookies</div>
        <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
          La PNPI utilise des cookies techniques necessaires au fonctionnement (session,
          preferences). Aucun cookie publicitaire n'est utilise.
          <a
            href="/legal/confidentialite"
            style={{ marginLeft: 4, color: "var(--accent, #006233)", fontWeight: 600 }}
          >
            En savoir plus
          </a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={decline}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            border: "1px solid var(--line, #dce4ef)",
            background: "transparent",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--text-soft)",
          }}
        >
          Refuser
        </button>
        <button
          onClick={accept}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
