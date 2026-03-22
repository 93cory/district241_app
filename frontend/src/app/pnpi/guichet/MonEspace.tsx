"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ATISummary {
  id: string;
  numero_ati: string;
  statut: string;
  type_activite: string;
  date_soumission: string;
  age_jours: number;
  sla_jours: number;
}

const STATUS_COLORS: Record<string, string> = {
  approuve: "#006233", rejete: "#b42318", soumis: "#526175",
  en_instruction: "#0c7eb4", valide: "#d97706",
};

export function MonEspace() {
  const [atis, setAtis] = useState<ATISummary[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pnpi/ati?limit=100")
      .then((r) => r.json())
      .then((data) => setAtis(data.atis || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? atis : atis.filter((a) => a.statut === filter);

  const counts = {
    total: atis.length,
    approuve: atis.filter((a) => a.statut === "approuve").length,
    en_cours: atis.filter((a) => !["approuve", "rejete"].includes(a.statut)).length,
    rejete: atis.filter((a) => a.statut === "rejete").length,
  };

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", value: counts.total, color: "#051B36" },
          { label: "Approuves", value: counts.approuve, color: "#006233" },
          { label: "En cours", value: counts.en_cours, color: "#0c7eb4" },
          { label: "Rejetes", value: counts.rejete, color: "#b42318" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            padding: "14px 16px", borderRadius: 14,
            background: `${kpi.color}08`, border: `1.5px solid ${kpi.color}20`,
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft, #526175)" }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "Tous" },
          { id: "soumis", label: "Soumis" },
          { id: "en_instruction", label: "En instruction" },
          { id: "valide", label: "Valide" },
          { id: "approuve", label: "Approuves" },
          { id: "rejete", label: "Rejetes" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "none", cursor: "pointer",
              background: filter === f.id ? "#006233" : "var(--bg-base, #f4f8fb)",
              color: filter === f.id ? "#fff" : "var(--text-soft, #526175)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ATI list */}
      {loading ? (
        <p style={{ color: "var(--text-soft, #526175)", fontSize: 13 }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-soft, #526175)", fontSize: 13 }}>
          Aucun ATI avec ce filtre.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((ati) => {
            const color = STATUS_COLORS[ati.statut] || "#526175";
            const overdue = ati.age_jours > ati.sla_jours && !["approuve", "rejete"].includes(ati.statut);
            return (
              <Link
                key={ati.id}
                href={`/pnpi/ati/${ati.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderRadius: 12,
                  background: "var(--bg-layer, #fff)",
                  border: `1.5px solid ${overdue ? "#b4231830" : "var(--line, #dce4ef)"}`,
                  textDecoration: "none", color: "inherit",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ati.numero_ati}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
                    {ati.type_activite?.slice(0, 60)}
                  </div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: `${color}12`, color,
                }}>
                  {ati.statut?.replace(/_/g, " ")}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: overdue ? "#b42318" : "var(--text-soft, #9ca3af)",
                }}>
                  {ati.age_jours}j
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
