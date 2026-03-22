"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/Toast";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActions({ selectedIds, onClear }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [motif, setMotif] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (selectedIds.length === 0) return null;

  const execute = async (action: "approve" | "reject") => {
    setBusy(true);
    try {
      const endpoint = action === "approve" ? "/api/ati/bulk-approve" : "/api/ati/bulk-reject";
      const body: any = { ati_ids: selectedIds };
      if (action === "approve") body.note = note;
      if (action === "reject") body.motif_rejet = motif;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      const successCount = data.approved?.length || data.rejected?.length || 0;
      const errorCount = data.errors?.length || 0;

      if (successCount > 0) showToast(`${successCount} ATI(s) ${action === "approve" ? "approuve(s)" : "rejete(s)"}`, "success");
      if (errorCount > 0) showToast(`${errorCount} erreur(s)`, "warning");

      setConfirmAction(null);
      onClear();
      router.refresh();
    } catch {
      showToast("Erreur", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{
        position: "sticky", bottom: 16, zIndex: 100,
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px", borderRadius: 16,
        background: "var(--bg-layer, #fff)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        border: "1.5px solid var(--line, #dce4ef)",
      }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          {selectedIds.length} selectionne(s)
        </span>
        <button onClick={() => setConfirmAction("approve")} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#006233", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
          Approuver
        </button>
        <button onClick={() => setConfirmAction("reject")} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#b42318", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
          Rejeter
        </button>
        <button onClick={onClear} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--line, #dce4ef)", background: "transparent", fontWeight: 600, cursor: "pointer" }}>
          Annuler
        </button>
      </div>

      <ConfirmDialog
        open={confirmAction === "approve"}
        title={`Approuver ${selectedIds.length} ATI(s) ?`}
        message="Cette action va approuver tous les ATI selectionnes en validation."
        confirmLabel="Approuver"
        onConfirm={() => execute("approve")}
        onCancel={() => setConfirmAction(null)}
      />

      {confirmAction === "reject" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)",
        }}>
          <div style={{ background: "var(--bg-layer, #fff)", borderRadius: 20, padding: 28, maxWidth: 440, width: "90%" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>Rejeter {selectedIds.length} ATI(s)</h3>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif de rejet (obligatoire)"
              rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid var(--line, #dce4ef)", marginBottom: 14, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid var(--line, #dce4ef)", background: "transparent", fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              <button onClick={() => execute("reject")} disabled={!motif.trim() || busy} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "#b42318", color: "#fff", fontWeight: 600, cursor: "pointer", opacity: !motif.trim() || busy ? 0.5 : 1 }}>
                {busy ? "..." : "Rejeter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
