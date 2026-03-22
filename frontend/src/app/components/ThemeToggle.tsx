"use client";

import { useState, useEffect } from "react";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "pnpi_theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    } else if (t === "light") {
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    } else {
      root.removeAttribute("data-theme");
      root.style.colorScheme = "";
    }
  };

  const cycle = () => {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  const icon = theme === "dark" ? "\uD83C\uDF19" : theme === "light" ? "\u2600\uFE0F" : "\uD83D\uDDA5\uFE0F";
  const label = theme === "dark" ? "Sombre" : theme === "light" ? "Clair" : "Auto";

  return (
    <button
      onClick={cycle}
      title={`Theme: ${label}`}
      aria-label={`Changer le theme (actuel: ${label})`}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "4px 10px", borderRadius: 8,
        border: "1px solid var(--line, #dce4ef)",
        background: "var(--bg-layer, #fff)",
        cursor: "pointer", fontSize: 12, fontWeight: 600,
        color: "var(--text-soft, #526175)",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
