"use client";
import { useState, useEffect, useRef } from "react";

interface Notif {
  id: string;
  title: string;
  message: string;
  severity: string;
  target_role: string | null;
  created_at: string;
  is_read: boolean;
}

const SEV_COLORS: Record<string, string> = { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", info: "#6b7280" };
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const markRead = async (id: string) => {
  try {
    await fetch(`${BACKEND}/admin/notifications/${id}/read`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    });
  } catch { /* non-critical: notifications unavailable */ }
};

export function NotificationsBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND}/admin/notifications`, { credentials: "include" });
        if (res.ok) setNotifs(await res.json());
      } catch { /* ignore — non-admin roles get 403 */ }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? `, ${unread} non lues` : ''}`}
        aria-expanded={open}
        style={{
          position: "relative", background: "none", border: "none", cursor: "pointer",
          padding: "0.25rem 0.35rem", borderRadius: "6px", lineHeight: 1,
          fontSize: "1.05rem", color: "#6b7280",
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-2px", right: "-2px",
            minWidth: "16px", height: "16px", borderRadius: "999px",
            background: "#ef4444", color: "white", fontSize: "0.6rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "320px", background: "white", borderRadius: "12px",
          border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
          zIndex: 2000, overflow: "hidden",
        }}>
          <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1f2937" }}>Notifications {unread > 0 && <span style={{ color: "#ef4444" }}>({unread} non lues)</span>}</span>
            {notifs.length === 0 && <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Aucune</span>}
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.82rem" }}>
              Aucune notification
            </div>
          ) : (
            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {notifs.slice(0, 10).map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) {
                      markRead(n.id);
                      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                    }
                  }}
                  style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f9fafb", background: n.is_read ? "white" : "#f0f4ff", cursor: n.is_read ? "default" : "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: n.is_read ? 500 : 700, fontSize: "0.82rem", color: "#1f2937" }}>{n.title}</span>
                    <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexShrink: 0 }}>
                      {!n.is_read && <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "#3b82f6", flexShrink: 0 }} />}
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: SEV_COLORS[n.severity] ?? "#6b7280", textTransform: "uppercase" }}>{n.severity}</span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>{n.message.slice(0, 90)}{n.message.length > 90 ? "..." : ""}</p>
                  <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#9ca3af" }}>
                    {new Date(n.created_at).toLocaleDateString("fr-FR")}
                    {n.target_role && <span> &middot; @{n.target_role}</span>}
                    {!n.is_read && <span style={{ color: "#3b82f6", marginLeft: "0.4rem" }}>· cliquer pour marquer lu</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {notifs.length > 10 && (
            <div style={{ padding: "0.625rem 1rem", borderTop: "1px solid #f3f4f6", fontSize: "0.78rem", color: "#6b7280", textAlign: "center" }}>
              {notifs.length - 10} notifications supplémentaires
            </div>
          )}
        </div>
      )}
    </div>
  );
}
