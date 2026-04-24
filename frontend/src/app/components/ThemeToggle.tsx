"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "pnpi_theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("light");
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", t);
    root.style.colorScheme = t;
  };

  const cycle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  const icon =
    theme === "dark" ? (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ) : (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );

  const label = theme === "dark" ? "Sombre" : "Clair";

  return (
    <button
      onClick={cycle}
      title={`Theme : ${label}`}
      aria-label={`Changer le theme (actuel : ${label})`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid var(--line, #dce4ef)",
        background: "var(--bg-layer, #fff)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-soft, #526175)",
        transition: "color 140ms ease, background 140ms ease",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
