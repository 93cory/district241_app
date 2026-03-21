"use client";

import { useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = "Confirmer", cancelLabel = "Annuler",
  danger = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 20, padding: "28px 32px",
        maxWidth: 440, width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        animation: "reveal-up 250ms ease-out",
      }}>
        <h3 id="confirm-title" style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: "0 0 24px", color: "#526175", fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px", border: "1px solid #dce4ef", borderRadius: 12,
              background: "#fff", color: "#526175", fontWeight: 600, cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px", border: "none", borderRadius: 12,
              background: danger ? "#b42318" : "#006233",
              color: "#fff", fontWeight: 600, cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
