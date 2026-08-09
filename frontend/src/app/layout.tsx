import Link from "next/link";

import { WebLogoutButton } from "./components/WebLogoutButton";
import { SessionStatusBadge } from "./components/SessionStatusBadge";
import { NotificationsBell } from "./components/NotificationsBell";
import { MegaNav } from "./components/MegaNav";
import { PNPILogo } from "./components/PNPILogo";
import { MobileNav } from "./components/MobileNav";
import { RepubliqueBand } from "./components/RepubliqueBand";
import { ImpersonateBanner } from "./components/ImpersonateBanner";
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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineBanner } from "./components/OfflineBanner";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { Footer } from "./components/Footer";
import { fetchBackendProfile } from "../lib/backend";
import { getDefaultRouteForRoles, getMegaNavForRoles } from "../lib/role-routing";
import "./globals.css";
// Temporarily disabled: import "leaflet/dist/leaflet.css";

export const metadata = {
  title: {
    default: "PNPI | Plateforme Nationale de Pilotage Industriel",
    template: "%s | PNPI",
  },
  description: "Ministere de l'Industrie du Gabon · Plateforme Nationale de Pilotage Industriel.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=20260730b", type: "image/svg+xml" },
      { url: "/pnpi-logo-officiel.png?v=20260730b", sizes: "512x512", type: "image/png" },
    ],
    apple: "/pnpi-logo-officiel.png?v=20260730b",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let roles: string[] = [];
  let profile: { username: string; full_name: string; roles: string[] } | null = null;
  try {
    const p = await fetchBackendProfile();
    profile = p;
    roles = p.roles ?? [];
  } catch {
    roles = [];
  }

  const mega = getMegaNavForRoles(roles);
  // Home link : si connecte, route par defaut du role ; sinon /connexion
  const homeHref = roles.length ? getDefaultRouteForRoles(roles) : "/connexion";

  return (
    <html lang="fr" data-theme="light">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=20260730b" />
        <link rel="icon" type="image/png" href="/pnpi-logo-officiel.png?v=20260730b" />
        <link rel="apple-touch-icon" href="/pnpi-logo-officiel.png?v=20260730b" />
        <meta name="theme-color" content="#1E3A8A" />
        <meta name="color-scheme" content="light" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning>
        <div className="page-shell">
          <a href="#main-content" className="skip-link">
            Aller au contenu principal
          </a>
          <ImpersonateBanner profile={profile ?? undefined} />
          <header role="banner">
            <RepubliqueBand />
            <nav className="top-nav" aria-label="Navigation principale">
              <Link href={homeHref} className="nav-brand" aria-label="Accueil PNPI">
                <PNPILogo size={56} priority />
                <span>PNPI</span>
              </Link>
              <MobileNav>
                {roles.length ? (
                  <MegaNav
                    sections={mega.sections}
                    tools={mega.tools}
                    quickAccess={mega.quickAccess}
                  />
                ) : (
                  <Link href="/connexion" className="mega-nav-quick-link">
                    Connexion
                  </Link>
                )}
                <div className="top-nav-actions">
                  <SessionStatusBadge />
                  <ServerLoad />
                  <ThemeToggle />
                  <AccessibilityPanel />
                  {roles.length ? <NotificationsBell /> : null}
                  {roles.length ? <WebLogoutButton /> : null}
                </div>
              </MobileNav>
            </nav>
          </header>
          <AnnouncementBanner />
          <main id="main-content">
            <Breadcrumbs />
            <ErrorBoundary>
              <ToastProvider>{children}</ToastProvider>
            </ErrorBoundary>
            <SessionTimeout />
          </main>
          <Footer />
          <PWAInstall />
          <OnboardingTour />
          <KeyboardShortcuts />
          <ChatAssistant />
          <CookieConsent />
          <CommandPalette />
          <OfflineBanner />
        </div>
      </body>
    </html>
  );
}
