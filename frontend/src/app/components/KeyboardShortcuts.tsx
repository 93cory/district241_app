"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  keys: string;
  label: string;
  action: () => void;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = [
    { keys: "g d", label: "Dashboard", action: () => router.push("/pnpi") },
    { keys: "g a", label: "ATI", action: () => router.push("/pnpi/ati") },
    { keys: "g o", label: "Operateurs", action: () => router.push("/pnpi/operateurs") },
    { keys: "g i", label: "Inspections", action: () => router.push("/pnpi/inspections") },
    { keys: "g m", label: "Messages", action: () => router.push("/pnpi/messages") },
    { keys: "g k", label: "Kanban", action: () => router.push("/pnpi/kanban") },
    { keys: "g c", label: "Calendrier", action: () => router.push("/pnpi/calendar") },
    { keys: "g s", label: "Recherche", action: () => router.push("/pnpi/search") },
    { keys: "g n", label: "Notes", action: () => router.push("/pnpi/notes") },
    { keys: "g p", label: "Profil", action: () => router.push("/profil") },
    { keys: "g e", label: "Synthese", action: () => router.push("/pnpi/executive") },
    { keys: "?", label: "Afficher les raccourcis", action: () => setShowHelp(true) },
  ];

  const [buffer, setBuffer] = useState("");
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      if (e.key === "Escape") {
        setShowHelp(false);
        setBuffer("");
        return;
      }

      if (e.key === "?") {
        setShowHelp((prev) => !prev);
        return;
      }

      const newBuffer = buffer + e.key;
      setBuffer(newBuffer);

      // Clear buffer after 800ms
      if (timer) clearTimeout(timer);
      const t = setTimeout(() => setBuffer(""), 800);
      setTimer(t);

      // Check matches
      const match = shortcuts.find((s) => s.keys === newBuffer);
      if (match) {
        match.action();
        setBuffer("");
        if (timer) clearTimeout(timer);
      }
    },
    [buffer, timer, shortcuts, router],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!showHelp) return null;

  return (
    <>
      <div
        onClick={() => setShowHelp(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99990,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99991,
          background: "var(--bg-layer, #fff)",
          borderRadius: 20,
          padding: "28px 32px",
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "reveal-up 200ms ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Raccourcis clavier</h3>
          <button
            onClick={() => setShowHelp(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--text-soft, #526175)",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {shortcuts.map((s) => (
            <div
              key={s.keys}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid var(--line, #eee)",
              }}
            >
              <span style={{ fontSize: 13 }}>{s.label}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {s.keys.split(" ").map((k, i) => (
                  <kbd
                    key={i}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: "var(--bg-base, #f4f8fb)",
                      border: "1px solid var(--line, #dce4ef)",
                      fontFamily: "monospace",
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 11,
            color: "var(--text-soft, #9ca3af)",
            textAlign: "center",
          }}
        >
          Appuyez sur{" "}
          <kbd
            style={{
              padding: "1px 4px",
              borderRadius: 3,
              background: "var(--bg-base)",
              border: "1px solid var(--line, #dce4ef)",
              fontFamily: "monospace",
            }}
          >
            ?
          </kbd>{" "}
          pour afficher/masquer
        </div>
      </div>
    </>
  );
}
