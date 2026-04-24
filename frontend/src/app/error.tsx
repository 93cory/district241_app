"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("PNPI Error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "center",
        padding: 32,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>&#9888;</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0c2a4a", margin: "0 0 8px" }}>
        Une erreur est survenue
      </h1>
      <p
        style={{ color: "#526175", fontSize: 15, maxWidth: 440, marginBottom: 24, lineHeight: 1.6 }}
      >
        Le service a rencontre un probleme inattendu. Veuillez reessayer ou contacter
        l&apos;administrateur si le probleme persiste.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "1px solid #dce4ef",
            background: "#fff",
            color: "#526175",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retour a l&apos;accueil
        </button>
        <button
          onClick={reset}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reessayer
        </button>
      </div>
    </div>
  );
}
