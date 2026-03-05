import Link from "next/link";
import Image from "next/image";

import { WebLogoutButton } from "./components/WebLogoutButton";
import { SessionStatusBadge } from "./components/SessionStatusBadge";
import { NotificationsBell } from "./components/NotificationsBell";
import { NavLinks } from "./components/NavLinks";
import { fetchBackendProfile } from "../lib/backend";
import { getNavLinksForRoles } from "../lib/role-routing";
import "./globals.css";

export const metadata = {
  title: "PNPI | Plateforme Nationale de Pilotage Industriel",
  description:
    "Ministere de l'Industrie du Gabon — Plateforme Nationale de Pilotage Industriel.",
  icons: { icon: "/pnpi_logo.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let roles: string[] = [];
  try {
    const profile = await fetchBackendProfile();
    roles = profile.roles ?? [];
  } catch {
    roles = [];
  }

  const navLinks = getNavLinksForRoles(roles);

  return (
    <html lang="fr">
      <body>
        <div className="page-shell">
          <nav className="top-nav">
            <Link href="/" className="nav-brand">
              <Image src="/pnpi_logo.png" alt="PNPI" width={32} height={32} style={{ borderRadius: 6 }} />
              <span>PNPI</span>
            </Link>
            <NavLinks links={navLinks} />
            <SessionStatusBadge />
            {roles.length ? <NotificationsBell /> : null}
            {roles.length ? <WebLogoutButton /> : null}
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
