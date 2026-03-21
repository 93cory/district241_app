"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const COLORS: Record<ToastType, string> = {
  success: "#006233",
  error: "#b42318",
  warning: "#f2b800",
  info: "#0d3f78",
};

const ICONS: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2715",
  warning: "\u26A0",
  info: "\u2139",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: "fixed", top: 16, right: 16, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8, maxWidth: 420,
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px",
              background: COLORS[toast.type],
              color: "#fff",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              fontSize: 14, fontWeight: 600,
              animation: "reveal-up 300ms ease-out",
            }}
          >
            <span style={{ fontSize: 18 }}>{ICONS[toast.type]}</span>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18 }}
              aria-label="Fermer la notification"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
