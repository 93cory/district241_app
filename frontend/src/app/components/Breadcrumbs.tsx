"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "": "Accueil",
  "pnpi": "PNPI",
  "ati": "Agrements ATI",
  "operateurs": "Operateurs",
  "admin": "Administration",
  "profil": "Mon profil",
  "briefing": "Briefing",
  "inspections": "Inspections",
  "pilotage": "Pilotage",
  "connexion": "Connexion",
  "about": "A propos",
  "contact": "Contact",
  "calendrier": "Calendrier",
};

export function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname || pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on auth pages
  if (segments[0] === "connexion") return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = ROUTE_LABELS[segment] || decodeURIComponent(segment);
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Fil d'Ariane" style={{ padding: "0.5rem 0", fontSize: "0.8rem" }}>
      <ol style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", listStyle: "none", margin: 0, padding: 0 }}>
        <li>
          <Link href="/" style={{ color: "var(--primary-color, #1565c0)", textDecoration: "none" }}>
            Accueil
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ color: "var(--text-secondary, #9ca3af)" }}>/</span>
            {crumb.isLast ? (
              <span style={{ color: "var(--text-primary, #1f2937)", fontWeight: 500 }} aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} style={{ color: "var(--primary-color, #1565c0)", textDecoration: "none" }}>
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
