"use client";

import { useState, useRef } from "react";
import { useToast } from "../components/Toast";

export function AdminUserImport() {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/users/bulk-import", { method: "POST", body: form });
      const data = await res.json();
      setResult(data);
      if (data.created > 0) showToast(`${data.created} utilisateur(s) importe(s)`, "success");
      if (data.errors > 0) showToast(`${data.errors} erreur(s) d'import`, "warning");
    } catch {
      showToast("Erreur lors de l'import", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: "var(--bg-layer, #fff)",
        border: "1.5px solid var(--line, #dce4ef)",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Import CSV utilisateurs</h3>
      <p style={{ fontSize: 13, color: "var(--text-soft, #526175)", margin: "0 0 14px" }}>
        Format : <code>username,full_name,roles,password</code>
        <br />
        Roles : admin, ministre, directeur, instructeur, inspecteur, operateur (separes par virgule)
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input ref={fileRef} type="file" accept=".csv" style={{ fontSize: 13 }} />
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            padding: "8px 20px",
            borderRadius: 10,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "Import..." : "Importer"}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "var(--bg-base, #f4f8fb)",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Resultat : {result.created} cree(s), {result.errors} erreur(s)
          </div>
          {result.error_details?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {result.error_details.map((e: any, i: number) => (
                <div key={i} style={{ color: "#b42318", fontSize: 12, marginBottom: 2 }}>
                  Ligne {e.line} ({e.username || "?"}) : {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
