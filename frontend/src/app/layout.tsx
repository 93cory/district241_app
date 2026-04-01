import Link from "next/link";
import Image from "next/image";

import { WebLogoutButton } from "./components/WebLogoutButton";
import { SessionStatusBadge } from "./components/SessionStatusBadge";
import { NotificationsBell } from "./components/NotificationsBell";
import { NavLinks } from "./components/NavLinks";
import { MobileNav } from "./components/MobileNav";
import { ToastProvider } from "./components/Toast";
import { SessionTimeout } from "./components/SessionTimeout";
import { PWAInstall } from "./components/PWAInstall";
import { OnboardingTour } from "./components/OnboardingTour";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ThemeToggle } from "./components/ThemeToggle";
import { ServerLoad } from "./components/ServerLoad";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { AccessibilityPanel } from "./components/AccessibilityPanel";
import { ChatAssistant } from "./components/ChatAssistant";
import { CookieConsent } from "./components/CookieConsent";
import { CommandPalette } from "./components/CommandPalette";
import { Footer } from "./components/Footer";
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#006233" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <div className="page-shell">
          <a href="#main-content" className="skip-link">Aller au contenu principal</a>
          <header role="banner">
            <nav className="top-nav" aria-label="Navigation principale">
              <Link href="/" className="nav-brand">
                <Image src="/pnpi_logo.png" alt="PNPI" width={32} height={32} style={{ borderRadius: 6 }} />
                <span>PNPI</span>
              </Link>
              <MobileNav>
                <NavLinks links={navLinks} />
                <SessionStatusBadge />
                <ServerLoad />
                <ThemeToggle />
                <AccessibilityPanel />
                {roles.length ? <NotificationsBell /> : null}
                {roles.length ? <WebLogoutButton /> : null}
              </MobileNav>
            </nav>
          </header>
          <AnnouncementBanner />
          <main id="main-content">
            <ToastProvider>{children}</ToastProvider>
            <SessionTimeout />
          </main>
          <Footer />
          <PWAInstall />
          <OnboardingTour />
          <KeyboardShortcuts />
          <ChatAssistant />
          <CookieConsent />
          <CommandPalette />
        </div>
      </body>
    </html>
  );
}
