import Link from "next/link";
import Image from "next/image";

import { WebLogoutButton } from "./components/WebLogoutButton";
import { SessionStatusBadge } from "./components/SessionStatusBadge";
import { NotificationsBell } from "./components/NotificationsBell";
import { NavLinks } from "./components/NavLinks";
import { MobileNav } from "./components/MobileNav";
import { ToastProvider } from "./components/Toast";
import { SessionTimeout } from "./components/SessionTimeout";
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
          <a href="#main-content" className="skip-link" style={{position:'absolute',left:'-9999px',top:'auto',width:'1px',height:'1px',overflow:'hidden'}}
            onFocus={(e) => { e.currentTarget.style.position='static'; e.currentTarget.style.width='auto'; e.currentTarget.style.height='auto'; }}
            onBlur={(e) => { e.currentTarget.style.position='absolute'; e.currentTarget.style.left='-9999px'; e.currentTarget.style.width='1px'; e.currentTarget.style.height='1px'; }}
          >Aller au contenu principal</a>
          <header role="banner">
            <nav className="top-nav" aria-label="Navigation principale">
              <Link href="/" className="nav-brand">
                <Image src="/pnpi_logo.png" alt="PNPI" width={32} height={32} style={{ borderRadius: 6 }} />
                <span>PNPI</span>
              </Link>
              <MobileNav>
                <NavLinks links={navLinks} />
                <SessionStatusBadge />
                {roles.length ? <NotificationsBell /> : null}
                {roles.length ? <WebLogoutButton /> : null}
              </MobileNav>
            </nav>
          </header>
          <main id="main-content">
            <ToastProvider>{children}</ToastProvider>
            <SessionTimeout />
          </main>
        </div>
      </body>
    </html>
  );
}
