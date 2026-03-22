"use client";

import { useState, useEffect } from "react";

export function ServerLoad() {
  const [latency, setLatency] = useState<number | null>(null);
  const [status, setStatus] = useState<"good" | "slow" | "down">("good");

  useEffect(() => {
    const check = async () => {
      const start = performance.now();
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const ms = Math.round(performance.now() - start);
        setLatency(ms);
        setStatus(ms < 500 ? "good" : ms < 2000 ? "slow" : "down");
      } catch {
        setLatency(null);
        setStatus("down");
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const colors = { good: "#006233", slow: "#d97706", down: "#b42318" };
  const labels = { good: "Rapide", slow: "Lent", down: "Hors ligne" };
  const color = colors[status];

  return (
    <div
      title={latency !== null ? `Latence: ${latency}ms` : "Serveur indisponible"}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 6,
        fontSize: 10, fontWeight: 600, color,
        background: `${color}10`,
        cursor: "default",
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: color,
        animation: status === "good" ? "none" : "pulse 2s infinite",
      }} />
      {latency !== null ? `${latency}ms` : labels[status]}
    </div>
  );
}
