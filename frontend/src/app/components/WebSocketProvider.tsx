"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";

interface WSContextType {
  unreadCount: number;
  lastNotification: { title: string; severity: string } | null;
  connected: boolean;
}

const WSContext = createContext<WSContextType>({ unreadCount: 0, lastNotification: null, connected: false });

export function useWebSocket() { return useContext(WSContext); }

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<{ title: string; severity: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(async () => {
    try {
      // Get token from session
      const res = await fetch("/api/auth/session");
      if (!res.ok) return;
      const session = await res.json();
      if (!session.token) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const backendHost = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
      const ws = new WebSocket(`${protocol}//${backendHost}/ws/notifications?token=${session.token}`);

      ws.onopen = () => {
        setConnected(true);
        // Ping every 30s to keep alive
        const ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 30000);
        ws.addEventListener("close", () => clearInterval(ping));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "init") {
            setUnreadCount(data.unread_count);
          } else if (data.type === "notification") {
            setUnreadCount((c) => c + 1);
            setLastNotification({ title: data.title, severity: data.severity });
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 5s
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    } catch {}
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return (
    <WSContext.Provider value={{ unreadCount, lastNotification, connected }}>
      {children}
    </WSContext.Provider>
  );
}
