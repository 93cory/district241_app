"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/Toast";

interface Props {
  atiId: string;
  motifRejet: string | null;
}

export function ResubmitForm({ atiId, motifRejet }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [observations, setObservations] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("observations", observations);
        const res = await fetch(`/api/ati/${atiId}/resubmit`, { method: "POST", body: form });
        if (!res.ok) {
          const data = await res.json();
          showToast(data.detail || "Erreur lors de la resoumission", "error");
          return;
        }
        showToast("ATI resoumis avec succes !", "success");
        router.refresh();
      } catch {
        showToast("Erreur de connexion", "error");
      }
    });
  };

  return (
    <div style={{
      padding: 20, borderRadius: 16,
      background: "#fff5f5", border: "1.5px solid #fecaca",
      marginTop: 16,
    }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#b42318" }}>
        Demande rejetee
      </h3>
      {motifRejet && (
        <p style={{ color: "#526175", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
          <strong>Motif :</strong> {motifRejet}
        </p>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: "#006233", color: "#fff", fontWeight: 600, cursor: "pointer",
          }}
        >
          Corriger et resoumettre
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Corrections apportees / observations
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              border: "1.5px solid #dce4ef", marginBottom: 12, boxSizing: "border-box",
            }}
            placeholder="Decrivez les corrections apportees suite au rejet..."
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: "10px 20px", borderRadius: 12, border: "1px solid #dce4ef",
                background: "#fff", color: "#526175", fontWeight: 600, cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "10px 20px", borderRadius: 12, border: "none",
                background: "#006233", color: "#fff", fontWeight: 600,
                cursor: "pointer", opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Resoumission..." : "Resoumettre l'ATI"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
