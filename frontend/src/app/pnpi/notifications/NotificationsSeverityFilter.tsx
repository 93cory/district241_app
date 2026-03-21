"use client";

import { useRouter, usePathname } from "next/navigation";

interface Props {
  activeSeverity: string;
  counts: {
    all: number;
    critical: number;
    high: number;
    medium: number;
    info: number;
  };
}

const TABS = [
  { key: "", label: "Toutes", color: "#003F8F" },
  { key: "critical", label: "Critiques", color: "#dc2626" },
  { key: "high", label: "Importantes", color: "#f59e0b" },
  { key: "medium", label: "Moyennes", color: "#3b82f6" },
  { key: "info", label: "Info", color: "#6b7280" },
] as const;

export function NotificationsSeverityFilter({ activeSeverity, counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const countMap: Record<string, number> = {
    "": counts.all,
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    info: counts.info,
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
      {TABS.map((tab) => {
        const isActive = activeSeverity === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key) {
                router.push(`${pathname}?severity=${tab.key}`);
              } else {
                router.push(pathname);
              }
            }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: `1.5px solid ${isActive ? tab.color : "#e5e7eb"}`,
              background: isActive ? `${tab.color}12` : "#fff",
              color: isActive ? tab.color : "#6b7280",
              fontWeight: isActive ? 700 : 500,
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 150ms ease",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            {tab.label}
            <span
              style={{
                background: isActive ? tab.color : "#e5e7eb",
                color: isActive ? "#fff" : "#6b7280",
                padding: "0.1rem 0.4rem",
                borderRadius: "999px",
                fontSize: "0.68rem",
                fontWeight: 700,
                minWidth: "1.2rem",
                textAlign: "center",
              }}
            >
              {countMap[tab.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
