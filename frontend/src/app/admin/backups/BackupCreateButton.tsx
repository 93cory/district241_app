"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BackupCreateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/backups/create", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Sauvegarde creee : ${data.filename ?? "OK"}`);
        router.refresh();
      } else {
        setMsg(data.detail ?? data.error ?? `Erreur ${res.status}`);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
      <button type="button" onClick={run} disabled={busy} className="btn-primary">
        {busy ? "Sauvegarde en cours..." : "Creer une sauvegarde"}
      </button>
      {msg && <span className="pnpi-page-sub" style={{ margin: 0, fontSize: "0.78rem" }}>{msg}</span>}
    </div>
  );
}
