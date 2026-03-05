"use client";

import { useRouter } from "next/navigation";

export const WebLogoutButton = () => {
  const router = useRouter();

  return (
    <button
      type="button"
      className="export-link"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/connexion");
        router.refresh();
      }}
      style={{ marginLeft: "auto" }}
    >
      Deconnexion
    </button>
  );
};
