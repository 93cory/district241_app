"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "pnpi_a11y";

interface A11ySettings {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexicFont: boolean;
}

const DEFAULTS: A11ySettings = {
  fontSize: 100,
  highContrast: false,
  reducedMotion: false,
  dyslexicFont: false,
};

export function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        applySettings(parsed);
      } catch {}
    }
  }, []);

  const applySettings = (s: A11ySettings) => {
    const root = document.documentElement;
    root.style.fontSize = `${s.fontSize}%`;

    if (s.highContrast) {
      root.setAttribute("data-high-contrast", "true");
    } else {
      root.removeAttribute("data-high-contrast");
    }

    if (s.reducedMotion) {
      root.style.setProperty("--anim-fast", "0ms");
      root.style.setProperty("--anim-med", "0ms");
      root.style.setProperty("--anim-slow", "0ms");
    } else {
      root.style.removeProperty("--anim-fast");
      root.style.removeProperty("--anim-med");
      root.style.removeProperty("--anim-slow");
    }

    if (s.dyslexicFont) {
      root.style.fontFamily = "OpenDyslexic, Comic Sans MS, cursive";
      root.style.letterSpacing = "0.05em";
      root.style.wordSpacing = "0.1em";
    } else {
      root.style.removeProperty("font-family");
      root.style.removeProperty("letter-spacing");
      root.style.removeProperty("word-spacing");
    }
  };

  const update = (key: keyof A11ySettings, value: any) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applySettings(next);
  };

  const reset = () => {
    setSettings(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
    applySettings(DEFAULTS);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Accessibilite"
        title="Options d'accessibilite"
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 8px", borderRadius: 8,
          border: "1px solid var(--line, #dce4ef)",
          background: "var(--bg-layer, #fff)",
          cursor: "pointer", fontSize: 14,
        }}
      >
        {"\u267F"}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 99980, background: "rgba(0,0,0,0.3)",
          }} />
          <div style={{
            position: "fixed", top: 60, right: 16, zIndex: 99981,
            background: "var(--bg-layer, #fff)", borderRadius: 16,
            padding: "20px 24px", width: 300,
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            animation: "reveal-up 200ms ease-out",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px" }}>Accessibilite</h3>

            {/* Font size */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Taille du texte : {settings.fontSize}%
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[80, 90, 100, 110, 125, 150].map(size => (
                  <button key={size} onClick={() => update("fontSize", size)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: settings.fontSize === size ? "#006233" : "var(--bg-base)",
                    color: settings.fontSize === size ? "#fff" : "var(--text-soft)",
                  }}>{size}%</button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            {[
              { key: "highContrast" as const, label: "Haut contraste", desc: "Renforce les contrastes de couleur" },
              { key: "reducedMotion" as const, label: "Reduire les animations", desc: "Desactive les transitions et animations" },
              { key: "dyslexicFont" as const, label: "Police dyslexie", desc: "Police adaptee aux personnes dyslexiques" },
            ].map(opt => (
              <label key={opt.key} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                marginBottom: 8, cursor: "pointer",
              }}>
                <input type="checkbox" checked={settings[opt.key] as boolean}
                  onChange={e => update(opt.key, e.target.checked)}
                  style={{ marginTop: 3, accentColor: "#006233" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-soft)" }}>{opt.desc}</div>
                </div>
              </label>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              <button onClick={reset} style={{
                fontSize: 12, color: "var(--text-soft)", background: "none", border: "none", cursor: "pointer",
              }}>Reinitialiser</button>
              <button onClick={() => setOpen(false)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none",
                background: "#006233", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}>Fermer</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
