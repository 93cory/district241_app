"use client";

import { useId, useState, type ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

const POSITIONS = {
  top: { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
  bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
  left: { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  right: { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
};

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            ...POSITIONS[position],
            zIndex: 9999,
            padding: "0.35rem 0.6rem",
            borderRadius: "6px",
            background: "var(--text-primary, #1f2937)",
            color: "#fff",
            fontSize: "0.75rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            animation: "fadeIn 150ms ease-out",
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
