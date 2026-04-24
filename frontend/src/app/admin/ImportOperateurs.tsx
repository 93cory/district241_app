"use client";

import { useState, useRef } from "react";

export function ImportOperateurs() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/operateurs/import-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setErrorMsg(data.detail || "Erreur d'import");
      }
    } catch {
      setErrorMsg("Erreur de connexion");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="chart-card" style={{ padding: 20, marginBottom: "1rem" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Import CSV Operateurs</h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-soft, #526175)" }}>
        Colonnes requises : <code>raison_sociale</code>, <code>nif_gabon</code>,{" "}
        <code>secteur</code>, <code>province</code>. Optionnelles : <code>ville</code>,{" "}
        <code>email</code>, <code>telephone</code>. Separateur : point-virgule.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
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
          {uploading ? "Import en cours..." : "Importer"}
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #ef4444",
            fontSize: 13,
            color: "#b91c1c",
          }}
        >
          {errorMsg}
        </div>
      )}

      {result && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: result.errors.length ? "#fffbeb" : "#dcfce7",
            border: `1px solid ${result.errors.length ? "#f2b800" : "#16a34a"}`,
            fontSize: 13,
          }}
        >
          <div>
            <strong>{result.created}</strong> operateur(s) crees
          </div>
          <div>
            <strong>{result.skipped}</strong> ignore(s) (doublons ou incomplets)
          </div>
          {result.errors.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {result.errors.length} erreur(s)
              </summary>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
