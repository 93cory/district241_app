"use client";

import { useState, useEffect } from "react";

interface Props {
  dateSoumission: string;
  slaJours: number;
  statut: string;
}

const TERMINAL_STATUTS = ["approuve", "rejete", "expire"];

export function SLAClock({ dateSoumission, slaJours, statut }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    if (TERMINAL_STATUTS.includes(statut)) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [statut]);

  if (!now) {
    return (
      <div style={{ padding: "14px 18px", borderRadius: 14, background: "#f1f5f9", height: 80 }} />
    );
  }

  const soumission = new Date(dateSoumission);
  const deadline = new Date(soumission.getTime() + slaJours * 86400000);
  const elapsed = now.getTime() - soumission.getTime();
  const total = slaJours * 86400000;
  const remaining = deadline.getTime() - now.getTime();
  const pct = Math.min((elapsed / total) * 100, 100);

  const isTerminal = terminal.includes(statut);
  const isOverdue = remaining < 0 && !isTerminal;
  const isWarning = remaining > 0 && remaining < total * 0.2 && !isTerminal;

  const formatRemaining = (ms: number) => {
    const abs = Math.abs(ms);
    const days = Math.floor(abs / 86400000);
    const hours = Math.floor((abs % 86400000) / 3600000);
    const mins = Math.floor((abs % 3600000) / 60000);
    const secs = Math.floor((abs % 60000) / 1000);

    if (days > 0) return `${days}j ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const color = isTerminal ? "#006233" : isOverdue ? "#b42318" : isWarning ? "#d97706" : "#0c7eb4";

  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: 14,
        background: `${color}08`,
        border: `2px solid ${color}20`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {isTerminal ? "SLA · Termine" : isOverdue ? "SLA · DEPASSE" : "SLA · Compte a rebours"}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
          {slaJours} jours alloues
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "var(--line, #e5e7eb)",
          marginBottom: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 4,
            width: `${Math.min(pct, 100)}%`,
            background: color,
            transition: "width 1s linear",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          {!isTerminal && (
            <span
              style={{ fontSize: 24, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}
            >
              {isOverdue ? "+" : ""}
              {formatRemaining(remaining)}
            </span>
          )}
          {isTerminal && (
            <span style={{ fontSize: 16, fontWeight: 700, color }}>Dossier cloture</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
          {Math.floor(elapsed / 86400000)}j / {slaJours}j ecoules
        </span>
      </div>
    </div>
  );
}
