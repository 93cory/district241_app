import Link from "next/link";

import { PNPILogo } from "./PNPILogo";

interface FooterLink {
  href: string;
  label: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Plateforme",
    links: [
      { href: "/about", label: "A propos" },
      { href: "/contact", label: "Contact" },
      { href: "/investors", label: "Investisseurs" },
      { href: "/open-data", label: "Open Data" },
    ],
  },
  {
    title: "Cadre legal",
    links: [
      { href: "/legal/cgu", label: "Conditions d'utilisation" },
      { href: "/legal/confidentialite", label: "Confidentialite" },
      { href: "/legal/accessibilite", label: "Accessibilite" },
      { href: "/plan-du-site", label: "Plan du site" },
    ],
  },
  {
    title: "Technique",
    links: [
      { href: "/api-docs", label: "API Docs" },
      { href: "/status", label: "Statut de la plateforme" },
      { href: "/changelog", label: "Historique des versions" },
      { href: "/embed", label: "Widgets a integrer" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="pnpi-footer no-print" role="contentinfo">
      <div className="pnpi-footer-flag" aria-hidden="true">
        <span className="flag-green" />
        <span className="flag-yellow" />
        <span className="flag-blue" />
      </div>

      <div className="pnpi-footer-inner">
        <div className="pnpi-footer-brand">
          <div className="pnpi-footer-logo">
            <PNPILogo size={52} />
            <div>
              <div className="pnpi-footer-brand-name">PNPI</div>
              <div className="pnpi-footer-brand-tagline">
                Plateforme Nationale de Pilotage Industriel
              </div>
            </div>
          </div>
          <p className="pnpi-footer-mission">
            L&apos;outil souverain de pilotage industriel de la Republique Gabonaise. Agrements
            techniques, inspections de conformite, cartographie et indicateurs ministeriels.
          </p>
          <div className="pnpi-footer-ministry">
            <span className="pnpi-footer-ministry-label">Maitre d&apos;ouvrage</span>
            <span className="pnpi-footer-ministry-name">
              Ministere de l&apos;Industrie et de la Transformation Locale
            </span>
          </div>
        </div>

        <div className="pnpi-footer-columns">
          {COLUMNS.map((col) => (
            <div key={col.title} className="pnpi-footer-col">
              <div className="pnpi-footer-col-title">{col.title}</div>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="pnpi-footer-baseline">
        <div>
          © {year} Republique Gabonaise · Ministere de l&apos;Industrie et de la Transformation
          Locale
        </div>
        <div className="pnpi-footer-version">
          PNPI v1.43 · Souverainete numerique au service du developpement industriel
        </div>
      </div>
    </footer>
  );
}
