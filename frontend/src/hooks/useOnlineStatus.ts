"use client";

import { useState, useEffect } from "react";

/**
 * Track browser online/offline status.
 *
 * Usage:
 *   const isOnline = useOnlineStatus();
 *   if (!isOnline) return <OfflineBanner />;
 */
export function useOnlineStatus(): boolean {
  // Toujours `true` en SSR et au 1er render client pour eviter un mismatch
  // d'hydratation (navigator indisponible cote serveur, peut etre false cote
  // client au premier render). On corrige la valeur reelle apres montage.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
