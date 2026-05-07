"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INTERVAL_MS = 120_000; // 2 minutes

export default function DashboardRefresh() {
  const router = useRouter();
  const lastRefreshRef = useRef<number | null>(null);
  const [ago, setAgo] = useState("");

  useEffect(() => {
    lastRefreshRef.current = Date.now();
    setAgo("a l'instant");

    const refreshTimer = setInterval(() => {
      router.refresh();
      lastRefreshRef.current = Date.now();
    }, INTERVAL_MS);

    const tickTimer = setInterval(() => {
      if (lastRefreshRef.current == null) return;
      const diff = Math.floor((Date.now() - lastRefreshRef.current) / 1000);
      if (diff < 10) setAgo("a l'instant");
      else if (diff < 60) setAgo(`il y a ${diff}s`);
      else setAgo(`il y a ${Math.floor(diff / 60)} min`);
    }, 5000);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(tickTimer);
    };
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#10b981",
          animation: "pulse 2s ease-in-out infinite",
        }}
      />
      <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>MAJ {ago}</span>
      <button
        onClick={() => {
          router.refresh();
          lastRefreshRef.current = Date.now();
          setAgo("a l'instant");
        }}
        style={{
          padding: "0.2rem 0.5rem",
          background: "transparent",
          border: "1px solid #e5e7eb",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "0.7rem",
          color: "#6b7280",
        }}
      >
        Actualiser
      </button>
    </div>
  );
}
