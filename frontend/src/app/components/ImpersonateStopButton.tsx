"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImpersonateStopButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const stop = async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
    } finally {
      router.replace("/admin");
      router.refresh();
    }
  };

  return (
    <button type="button" className="impersonate-stop-btn" onClick={stop} disabled={busy}>
      {busy ? "Sortie..." : "Sortir du mode simulation"}
    </button>
  );
}
