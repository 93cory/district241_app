"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUsernameFallback, userScopedStorageKey } from "../../lib/user-scoped-storage";

interface TourStep {
  title: string;
  description: string;
  target?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bienvenue sur PNPI !",
    description:
      "La Plateforme Nationale de Pilotage Industriel vous permet de gerer les agrements techniques, suivre les inspections et piloter la politique industrielle du Gabon.",
  },
  {
    title: "Navigation",
    description:
      "Utilisez la barre de navigation en haut pour acceder aux differentes sections. Les liens disponibles dependent de votre role.",
    target: "nav",
  },
  {
    title: "Theme sombre",
    description:
      "Cliquez sur le bouton de theme pour basculer entre les modes clair, sombre et automatique.",
  },
  {
    title: "Notifications",
    description:
      "La cloche de notifications vous alerte des evenements importants : ATI approuves, alertes SLA, messages recus.",
  },
  {
    title: "Messages",
    description:
      "Communiquez directement avec les autres utilisateurs via la messagerie interne. Lien disponible dans la navigation.",
  },
  {
    title: "Mon profil",
    description:
      "Depuis votre profil, configurez la 2FA, la biometrie, les preferences de notification et consultez votre historique de connexion.",
  },
  {
    title: "Aide",
    description:
      "Besoin d'aide ? La page Aide contient des FAQ detaillees pour chaque fonctionnalite. Bonne utilisation de PNPI !",
  },
];

const STORAGE_KEY = "pnpi_onboarding_done";

export function OnboardingTour() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUsernameFallback().then((username) =>
      setStorageKey(userScopedStorageKey(STORAGE_KEY, username)),
    );
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    const tourRequested = new URLSearchParams(window.location.search).get("tour") === "1";
    const isAuthenticatedArea = ["/admin", "/briefing", "/pnpi", "/profil"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (!isAuthenticatedArea || !tourRequested) {
      setActive(false);
      return;
    }
    const done = localStorage.getItem(storageKey);
    if (!done) {
      // Delay to let the page render first
      const timer = setTimeout(() => setActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname, storageKey]);

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const finish = () => {
    setActive(false);
    if (storageKey) localStorage.setItem(storageKey, "true");
  };

  const skip = () => {
    finish();
  };

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99998,
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(2px)",
        }}
        onClick={skip}
      />

      {/* Tour card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          background: "var(--bg-layer, #fff)",
          borderRadius: 20,
          padding: "28px 32px",
          maxWidth: 440,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "reveal-up 300ms ease-out",
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? "#006233" : i < step ? "#006233" : "var(--line, #dce4ef)",
                opacity: i <= step ? 1 : 0.5,
                transition: "all 200ms ease",
              }}
            />
          ))}
        </div>

        {/* Step counter */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-soft, #9ca3af)",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {step + 1} / {TOUR_STEPS.length}
        </div>

        {/* Content */}
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", textAlign: "center" }}>
          {currentStep.title}
        </h3>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-soft, #526175)",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          {currentStep.description}
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={skip}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-soft, #9ca3af)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Passer
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {!isFirst && (
              <button
                onClick={prev}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1.5px solid var(--line, #dce4ef)",
                  background: "transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--text-soft, #526175)",
                }}
              >
                Precedent
              </button>
            )}
            <button
              onClick={next}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                border: "none",
                background: "#006233",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isLast ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
