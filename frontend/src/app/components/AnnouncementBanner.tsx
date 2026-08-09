"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: string;
  created_at: string;
}

const SEV_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  critical: { bg: "#fef2f2", border: "#b42318", color: "#b42318", icon: "\u{1F6A8}" },
  warning: { bg: "#fef3c7", border: "#d97706", color: "#92400e", icon: "\u26A0\uFE0F" },
  info: { bg: "#e0f2fe", border: "#0c7eb4", color: "#075985", icon: "\u2139\uFE0F" },
  success: { bg: "#dcfce7", border: "#006233", color: "#166534", icon: "\u2705" },
};

export function AnnouncementBanner() {
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const isAuthenticatedArea = ["/admin", "/briefing", "/inspecteur", "/pnpi", "/profil"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (!isAuthenticatedArea) {
      setAnnouncements([]);
      return;
    }
    const controller = new AbortController();
    fetch("/api/announcements/active", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => setAnnouncements(Array.isArray(d?.announcements) ? d.announcements : []))
      .catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "0 16px",
        marginBottom: 8,
      }}
    >
      {visible.map((ann) => {
        const style = SEV_STYLES[ann.severity] || SEV_STYLES.info;
        return (
          <div
            key={ann.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              background: style.bg,
              borderLeft: `4px solid ${style.border}`,
            }}
          >
            <span style={{ fontSize: 16 }}>{style.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: style.color }}>{ann.title}</div>
              <div style={{ fontSize: 12, color: style.color, opacity: 0.85 }}>{ann.body}</div>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, ann.id]))}
              style={{
                background: "none",
                border: "none",
                color: style.color,
                cursor: "pointer",
                fontSize: 16,
                opacity: 0.6,
              }}
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
