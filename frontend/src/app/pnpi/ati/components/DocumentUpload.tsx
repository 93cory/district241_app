"use client";
import { useState, useTransition, useRef } from "react";

interface DocumentRead {
  id: string;
  ati_id: string;
  nom_fichier: string;
  type_document: string;
  taille_octets: number;
  uploaded_at: string;
  uploaded_by: string;
}

const TYPE_LABELS: Record<string, string> = {
  statuts: "Statuts", bilan: "Bilan financier", plan_site: "Plan du site",
  certification: "Certification", autre: "Autre document",
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function DocumentUpload({ atiId, initialDocs }: { atiId: string; initialDocs: DocumentRead[] }) {
  const [docs, setDocs] = useState<DocumentRead[]>(initialDocs);
  const [typeDoc, setTypeDoc] = useState("autre");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("type_document", typeDoc);

        const res = await fetch(`${BACKEND_URL}/pnpi/ati/${atiId}/documents`, {
          method: "POST",
          body: form,
          credentials: "include",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { detail?: string };
          throw new Error(body.detail ?? `Erreur ${res.status}`);
        }

        const newDoc = await res.json() as DocumentRead;
        setDocs(prev => [newDoc, ...prev]);
        setSuccess(`"${newDoc.nom_fichier}" uploade avec succes.`);
        if (fileRef.current) fileRef.current.value = "";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
  };

  const handleDelete = async (docId: string, nomFichier: string) => {
    if (!confirm(`Supprimer "${nomFichier}" ?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/pnpi/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "0.8rem", boxSizing: "border-box" };

  return (
    <div>
      <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>Documents du dossier ({docs.length})</h3>

      {/* Upload form */}
      <form onSubmit={handleUpload} style={{ marginBottom: "1rem", padding: "0.875rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <select value={typeDoc} onChange={e => setTypeDoc(e.target.value)} style={{ ...inputStyle, width: "auto", flex: "1 1 140px" }}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ ...inputStyle, flex: "2 1 200px" }} />
          <button type="submit" disabled={isPending} style={{ padding: "0.4rem 0.875rem", background: isPending ? "#9ca3af" : "#003F8F", color: "white", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "0.8rem", cursor: isPending ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {isPending ? "Upload..." : "Ajouter"}
          </button>
        </div>
        {success && <div style={{ color: "#16a34a", fontSize: "0.78rem" }}>{success}</div>}
        {error && <div style={{ color: "#b42318", fontSize: "0.78rem" }}>{error}</div>}
      </form>

      {/* Documents list */}
      {docs.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "0.82rem", margin: 0 }}>Aucun document joint. Utilisez le formulaire ci-dessus.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {docs.map(doc => (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "white", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nom_fichier}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.1rem" }}>
                  {TYPE_LABELS[doc.type_document] ?? doc.type_document} &middot; {formatSize(doc.taille_octets)} &middot; {new Date(doc.uploaded_at).toLocaleDateString("fr-FR")} &middot; {doc.uploaded_by}
                </div>
              </div>
              <a href={`${BACKEND_URL}/pnpi/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer"
                style={{ padding: "0.3rem 0.6rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", color: "#374151", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                &#x2193; DL
              </a>
              <button onClick={() => handleDelete(doc.id, doc.nom_fichier)}
                style={{ padding: "0.3rem 0.6rem", background: "transparent", border: "1px solid #fca5a5", borderRadius: "6px", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer" }}>
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
