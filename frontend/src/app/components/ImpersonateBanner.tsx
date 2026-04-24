import { cookies } from "next/headers";

import { ImpersonateStopButton } from "./ImpersonateStopButton";

const ORIGINAL_COOKIE = "pnpi_original_token";

interface Props {
  profile?: { username: string; full_name: string; roles: string[] };
}

/**
 * Banniere affichee en haut de page quand un admin simule un autre utilisateur.
 * Lit le cookie httpOnly `pnpi_original_token` pour detecter l'etat simulation.
 */
export async function ImpersonateBanner({ profile }: Props) {
  const jar = await cookies();
  const isImpersonating = Boolean(jar.get(ORIGINAL_COOKIE)?.value);

  if (!isImpersonating || !profile) return null;

  return (
    <div className="impersonate-banner" role="status" aria-live="polite">
      <div className="impersonate-banner-inner">
        <div className="impersonate-banner-icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            <path d="M23 11l-3-3m0 0l-3 3m3-3v7" />
          </svg>
        </div>
        <div className="impersonate-banner-text">
          <strong>Mode simulation actif</strong>
          <span>
            Vous visualisez la plateforme comme <strong>{profile.full_name}</strong> (
            {profile.username}, {profile.roles.join(", ")})
          </span>
        </div>
        <ImpersonateStopButton />
      </div>
    </div>
  );
}
