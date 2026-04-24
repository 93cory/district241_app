"use client";

import { useRouter } from "next/navigation";

export const WebLogoutButton = () => {
  const router = useRouter();

  return (
    <button
      type="button"
      className="export-link"
      onClick={async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          /* proceed to redirect even if logout fetch fails */
        }
        router.replace("/connexion");
        router.refresh();
      }}
      style={{ marginLeft: "auto" }}
    >
      Deconnexion
    </button>
  );
};
