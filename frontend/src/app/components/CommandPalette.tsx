"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: string;
  href?: string;
  action?: () => void;
  category: string;
}

const COMMANDS: Command[] = [
  // Navigation
  { id: "nav-dash", label: "Dashboard", icon: "📊", href: "/pnpi", category: "Navigation" },
  { id: "nav-exec", label: "Synthese executive", icon: "📈", href: "/pnpi/executive", category: "Navigation" },
  { id: "nav-ati", label: "Liste des ATI", icon: "📋", href: "/pnpi/ati", category: "Navigation" },
  { id: "nav-kanban", label: "Kanban ATI", icon: "📌", href: "/pnpi/kanban", category: "Navigation" },
  { id: "nav-ops", label: "Operateurs", icon: "🏭", href: "/pnpi/operateurs", category: "Navigation" },
  { id: "nav-insp", label: "Inspections", icon: "🔍", href: "/pnpi/inspections", category: "Navigation" },
  { id: "nav-map", label: "Carte interactive", icon: "🗺️", href: "/pnpi/map", category: "Navigation" },
  { id: "nav-cal", label: "Calendrier", icon: "📅", href: "/pnpi/calendar", category: "Navigation" },
  { id: "nav-msg", label: "Messages", icon: "💬", href: "/pnpi/messages", category: "Navigation" },
  { id: "nav-search", label: "Recherche avancee", icon: "🔎", href: "/pnpi/search", category: "Navigation" },
  { id: "nav-profil", label: "Mon profil", icon: "👤", href: "/profil", category: "Navigation" },
  { id: "nav-notes", label: "Mes notes", icon: "📝", href: "/pnpi/notes", category: "Navigation" },
  { id: "nav-favs", label: "Mes favoris", icon: "⭐", href: "/pnpi/favorites", category: "Navigation" },
  // Analytics
  { id: "ana-stats", label: "Statistiques", icon: "📊", href: "/pnpi/stats", category: "Analytics" },
  { id: "ana-pred", label: "Predictions", icon: "🔮", href: "/pnpi/predictions", category: "Analytics" },
  { id: "ana-bench", label: "Benchmark provincial", icon: "🏆", href: "/pnpi/benchmark", category: "Analytics" },
  { id: "ana-cemac", label: "Benchmark CEMAC", icon: "🌍", href: "/pnpi/cemac", category: "Analytics" },
  { id: "ana-impact", label: "Impact economique", icon: "💰", href: "/pnpi/economic-impact", category: "Analytics" },
  { id: "ana-social", label: "Impact social", icon: "👷", href: "/pnpi/social-impact", category: "Analytics" },
  { id: "ana-carbon", label: "Empreinte carbone", icon: "🌿", href: "/pnpi/carbon", category: "Analytics" },
  { id: "ana-alerts", label: "Alertes intelligentes", icon: "🚨", href: "/pnpi/smart-alerts", category: "Analytics" },
  { id: "ana-pivot", label: "Tableau croise", icon: "📐", href: "/pnpi/pivot", category: "Analytics" },
  // Actions
  { id: "act-newati", label: "Soumettre un ATI", icon: "➕", href: "/pnpi/guichet", category: "Actions" },
  { id: "act-roi", label: "Simulateur ROI", icon: "🧮", href: "/pnpi/roi-simulator", category: "Actions" },
  { id: "act-pres", label: "Mode presentation", icon: "🖥️", href: "/pnpi/presentation", category: "Actions" },
  { id: "act-export", label: "Rapports", icon: "📤", href: "/pnpi/reports", category: "Actions" },
  { id: "act-form", label: "Formation", icon: "🎓", href: "/pnpi/formation", category: "Actions" },
  // Admin
  { id: "adm-users", label: "Administration", icon: "⚙️", href: "/admin", category: "Admin" },
  { id: "adm-audit", label: "Journal d'audit", icon: "📜", href: "/admin/audit-log", category: "Admin" },
  { id: "adm-sec", label: "Securite", icon: "🔒", href: "/admin/security", category: "Admin" },
  { id: "adm-wf", label: "Workflows", icon: "🔄", href: "/admin/workflows", category: "Admin" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS.slice(0, 12);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery("");
        setSelectedIdx(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const execute = useCallback((cmd: Command) => {
    setOpen(false);
    setQuery("");
    if (cmd.href) router.push(cmd.href);
    if (cmd.action) cmd.action();
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[selectedIdx]) { execute(filtered[selectedIdx]); }
  };

  if (!open) return null;

  return (
    <>
      <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
        zIndex: 99999, width: "90%", maxWidth: 560,
        background: "var(--bg-layer, #fff)", borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden",
        animation: "reveal-up 150ms ease-out",
      }}>
        {/* Search input */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line, #dce4ef)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une page, action ou commande..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, background: "transparent", color: "var(--text-main)" }}
          />
          <kbd style={{ padding: "2px 6px", borderRadius: 4, background: "var(--bg-base)", border: "1px solid var(--line)", fontSize: 10, fontFamily: "monospace" }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflow: "auto", padding: "6px 0" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-soft)", fontSize: 13 }}>
              Aucun resultat pour &quot;{query}&quot;
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 18px", border: "none", cursor: "pointer", textAlign: "left",
                background: i === selectedIdx ? "var(--bg-base, #f4f8fb)" : "transparent",
                color: "var(--text-main)",
              }}
            >
              <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{cmd.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: i === selectedIdx ? 700 : 500 }}>{cmd.label}</div>
              </div>
              <span style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)", background: "var(--bg-base)", padding: "1px 6px", borderRadius: 4 }}>
                {cmd.category}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "8px 18px", borderTop: "1px solid var(--line)", fontSize: 10, color: "var(--text-soft)", display: "flex", gap: 12 }}>
          <span>↑↓ Naviguer</span>
          <span>↵ Ouvrir</span>
          <span>ESC Fermer</span>
          <span style={{ marginLeft: "auto" }}>Ctrl+K pour ouvrir</span>
        </div>
      </div>
    </>
  );
}
