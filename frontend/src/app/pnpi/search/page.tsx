"use client";

import { useState } from "react";
import Link from "next/link";

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ati: { bg: "#e0f2fe", color: "#0c7eb4", label: "ATI" },
  operateur: { bg: "#dcfce7", color: "#006233", label: "Operateur" },
  inspection: { bg: "#f3e8ff", color: "#7c3aed", label: "Inspection" },
};

interface Result {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  statut: string;
  date: string | null;
  link: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query, limit: "30" });
      if (type !== "all") params.set("type", type);
      const res = await fetch(`/api/pnpi/dashboard/search/advanced?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>Recherche avancee</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Rechercher ATI, operateur, inspection..."
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 12,
            border: "1.5px solid var(--line, #dce4ef)",
            fontSize: 14,
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1.5px solid var(--line, #dce4ef)",
            fontSize: 13,
          }}
        >
          <option value="all">Tout</option>
          <option value="ati">ATI</option>
          <option value="operateur">Operateurs</option>
          <option value="inspection">Inspections</option>
        </select>
        <button
          onClick={search}
          disabled={loading}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : "Chercher"}
        </button>
      </div>

      {searched && (
        <p style={{ fontSize: 13, color: "var(--text-soft, #526175)", marginBottom: 12 }}>
          {total} resultat(s) pour &quot;{query}&quot;
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((r) => {
          const style = TYPE_STYLES[r.type] || TYPE_STYLES.ati;
          return (
            <Link
              key={`${r.type}-${r.id}`}
              href={r.link}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--bg-layer, #fff)",
                border: "1.5px solid var(--line, #dce4ef)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  background: style.bg,
                  color: style.color,
                }}
              >
                {style.label}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>{r.subtitle}</div>
              </div>
              {r.date && (
                <span style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
                  {new Date(r.date).toLocaleDateString("fr-FR")}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
