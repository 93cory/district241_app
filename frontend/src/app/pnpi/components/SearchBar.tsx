"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  statut: string | null;
  href: string;
}

const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/pnpi/dashboard/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as SearchResult[];
        setResults(data);
        setOpen(true);
      }
    } catch { /* non-critical: search unavailable */ }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flex: "1 1 280px", maxWidth: "360px" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: "0.9rem", pointerEvents: "none" }}>🔍</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Rechercher ATI, operateur, NIF..."
          style={{
            width: "100%", padding: "0.5rem 0.75rem 0.5rem 2.2rem",
            border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.85rem",
            background: "white", boxSizing: "border-box", outline: "none",
          }}
        />
        {loading && <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "#6b7280" }}>...</span>}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "white", borderRadius: "10px", border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1000, overflow: "hidden",
        }}>
          {results.map(r => (
            <button key={r.id} onClick={() => handleSelect(r.href)} style={{
              width: "100%", padding: "0.75rem 1rem", background: "none", border: "none",
              textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem",
              borderBottom: "1px solid #f9fafb",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{
                width: "28px", height: "28px", borderRadius: "6px", flexShrink: 0,
                background: r.type === "ati" ? "#eff6ff" : "#f0fdf4",
                color: r.type === "ati" ? "#003F8F" : "#009440",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800,
              }}>{r.type === "ati" ? "ATI" : "OP"}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1f2937" }}>{r.title}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subtitle}</div>
              </div>
              {r.statut && (
                <span style={{ padding: "0.1rem 0.4rem", borderRadius: "999px", background: `${STATUT_COLORS[r.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[r.statut] ?? "#6b7280", fontWeight: 700, fontSize: "0.68rem", flexShrink: 0 }}>
                  {r.statut.replace("_", " ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "0.875rem 1rem", color: "#6b7280", fontSize: "0.82rem", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1000 }}>
          Aucun resultat pour &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
