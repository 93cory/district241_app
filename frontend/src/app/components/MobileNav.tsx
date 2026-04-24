"use client";

import { useState, useEffect, useRef } from "react";

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="mobile-nav-container">
      <button
        className="hamburger-btn"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
      >
        <span className={`hamburger-icon ${open ? "hamburger-open" : ""}`}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {/* Desktop: always visible */}
      <div className="desktop-nav">{children}</div>

      {/* Mobile: slide-in drawer */}
      {open && (
        <div className="mobile-nav-overlay" onClick={() => setOpen(false)}>
          <nav
            className="mobile-nav-drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Menu principal"
          >
            <div onClick={() => setOpen(false)}>{children}</div>
          </nav>
        </div>
      )}
    </div>
  );
}
