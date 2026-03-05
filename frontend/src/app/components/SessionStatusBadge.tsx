"use client";

import { useEffect, useMemo, useState } from "react";

type SessionPayload = {
  status: "non_connecte" | "active" | "a_renouveler" | "invalide";
  label: string;
  user: { username: string; full_name: string; roles: string[] } | null;
};

const colorByStatus: Record<SessionPayload["status"], string> = {
  active: "#0f6b3f",
  a_renouveler: "#b26a00",
  invalide: "#b42318",
  non_connecte: "#6c7482",
};

export const SessionStatusBadge = () => {
  const [payload, setPayload] = useState<SessionPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const body = (await response.json()) as SessionPayload;
        if (!cancelled) {
          setPayload(body);
        }
      } catch {
        if (!cancelled) {
          setPayload({
            status: "invalide",
            label: "Session invalide",
            user: null,
          });
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 45000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const resolved = useMemo<SessionPayload>(
    () =>
      payload ?? {
        status: "non_connecte",
        label: "Verification session...",
        user: null,
      },
    [payload]
  );

  return (
    <span
      title={resolved.user ? `${resolved.user.full_name} (${resolved.user.roles.join(", ")})` : resolved.label}
      style={{
        border: `1px solid ${colorByStatus[resolved.status]}66`,
        color: colorByStatus[resolved.status],
        borderRadius: 999,
        padding: "0.4rem 0.75rem",
        background: "#fff",
        fontSize: "0.82rem",
        fontWeight: 600,
      }}
    >
      {resolved.user ? `${resolved.label} - ${resolved.user.username}` : resolved.label}
    </span>
  );
};
