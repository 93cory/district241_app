"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MegaSection, NavLink as NavLinkType } from "../../lib/role-routing";

interface MegaNavProps {
  sections: MegaSection[];
  tools: NavLinkType[];
  quickAccess: NavLinkType[];
}

// -------------------------------------------------------------
// Icones SVG sobres (style Lucide/Heroicons, monochrome)
// -------------------------------------------------------------
const ICONS: Record<string, JSX.Element> = {
  dashboard: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  seal: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  ),
  map: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v16" />
      <path d="M15 6v16" />
    </svg>
  ),
  chart: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  ),
  gear: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  search: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  user: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  chevron: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

export function MegaNav({ sections, tools, quickAccess }: MegaNavProps) {
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Ferme au clic exterieur
  useEffect(() => {
    if (!openKey && !toolsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenKey(null);
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openKey, toolsOpen]);

  // Ferme sur Escape
  useEffect(() => {
    if (!openKey && !toolsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenKey(null);
        setToolsOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openKey, toolsOpen]);

  // Ferme sur changement de route
  useEffect(() => {
    setOpenKey(null);
    setToolsOpen(false);
  }, [pathname]);

  const isActiveSection = (section: MegaSection): boolean => {
    if (pathname === section.href) return true;
    return section.groups.some((g) =>
      g.items.some((it) => pathname === it.href || pathname.startsWith(it.href + "/")),
    );
  };

  return (
    <div ref={navRef} className="mega-nav">
      {/* Sections principales */}
      {sections.map((section) => {
        const active = isActiveSection(section);
        const open = openKey === section.key;
        return (
          <div
            key={section.key}
            className={`mega-nav-section ${open ? "is-open" : ""}`}
            onMouseEnter={() => setOpenKey(section.key)}
          >
            <button
              type="button"
              className={`mega-nav-trigger ${active ? "is-active" : ""}`}
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => {
                setToolsOpen(false);
                setOpenKey(open ? null : section.key);
              }}
            >
              <span className="mega-nav-icon">{ICONS[section.icon] ?? ICONS.dashboard}</span>
              <span>{section.label}</span>
              <span className={`mega-nav-chevron ${open ? "is-open" : ""}`}>{ICONS.chevron}</span>
            </button>

            {open && (
              <div className="mega-nav-panel" role="menu" onMouseLeave={() => setOpenKey(null)}>
                <div className="mega-nav-panel-head">
                  <div className="mega-nav-panel-icon">{ICONS[section.icon]}</div>
                  <div>
                    <Link href={section.href} className="mega-nav-panel-title">
                      {section.label}
                    </Link>
                    <p className="mega-nav-panel-desc">{section.description}</p>
                  </div>
                </div>
                <div className="mega-nav-groups">
                  {section.groups.map((group) => (
                    <div key={group.title} className="mega-nav-group">
                      <div className="mega-nav-group-title">{group.title}</div>
                      <ul>
                        {group.items.map((item) => {
                          const itActive =
                            pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={itActive ? "is-active" : undefined}
                                role="menuitem"
                              >
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Menu "Outils" (recherche, annuaire, aide...) */}
      {tools.length > 0 && (
        <div
          className={`mega-nav-section mega-nav-section--tools ${toolsOpen ? "is-open" : ""}`}
          onMouseEnter={() => setToolsOpen(true)}
        >
          <button
            type="button"
            className="mega-nav-trigger"
            aria-expanded={toolsOpen}
            aria-haspopup="true"
            onClick={() => {
              setOpenKey(null);
              setToolsOpen(!toolsOpen);
            }}
          >
            <span className="mega-nav-icon">{ICONS.search}</span>
            <span>Outils</span>
            <span className={`mega-nav-chevron ${toolsOpen ? "is-open" : ""}`}>
              {ICONS.chevron}
            </span>
          </button>

          {toolsOpen && (
            <div
              className="mega-nav-panel mega-nav-panel--tools"
              role="menu"
              onMouseLeave={() => setToolsOpen(false)}
            >
              <ul className="mega-nav-tools-list">
                {tools.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      className={
                        pathname === t.href || pathname.startsWith(t.href + "/")
                          ? "is-active"
                          : undefined
                      }
                      role="menuitem"
                    >
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Acces rapide (Mon profil, Mon guichet, Mes inspections) */}
      {quickAccess.length > 0 && (
        <div className="mega-nav-quick">
          {quickAccess.map((q) => {
            const itActive = pathname === q.href || pathname.startsWith(q.href + "/");
            return (
              <Link
                key={q.href}
                href={q.href}
                className={`mega-nav-quick-link ${itActive ? "is-active" : ""}`}
              >
                <span className="mega-nav-icon">{ICONS.user}</span>
                <span>{q.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
