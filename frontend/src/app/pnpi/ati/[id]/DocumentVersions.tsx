"use client";

import { useState, useEffect } from "react";

interface DocVersion {
  id: string;
  document_id: string;
  version: number;
  filename: string;
  file_size: number | null;
  uploaded_by: string;
  comment: string | null;
  created_at: string;
}

export function DocumentVersions({ atiId }: { atiId: string }) {
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/documents/ati/${atiId}/versions`)
      .then(r => r.ok ? r.json() : { versions: [] })
      .then(d => setVersions(d.versions || []))
      .catch(() => {});
  }, [atiId, open]);

  // Group by document_id
  const groups: Record<string, DocVersion[]> = {};
  for (const v of versions) {
    if (!groups[v.document_id]) groups[v.document_id] = [];
    groups[v.document_id].push(v);
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: "1.5px solid var(--line, #dce4ef)", background: "transparent",
        cursor: "pointer", color: "var(--text-soft, #526175)",
      }}>
        {open ? "Masquer versions" : `Versions documents (${versions.length})`}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {Object.entries(groups).length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)" }}>Aucune version enregistree.</p>
          )}
          {Object.entries(groups).map(([docId, vers]) => (
            <div key={docId} style={{
              marginBottom: 10, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--line, #dce4ef)", background: "var(--bg-base, #f4f8fb)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                {vers[0].filename}
              </div>
              {vers.map(v => (
                <div key={v.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
                  borderBottom: "1px solid var(--line, #eee)", fontSize: 12,
                }}>
                  <span style={{
                    padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: v.version === vers[0].version ? "#dcfce7" : "var(--bg-base, #f4f8fb)",
                    color: v.version === vers[0].version ? "#006233" : "var(--text-soft)",
                  }}>
                    v{v.version}
                  </span>
                  <span style={{ color: "var(--text-soft, #526175)" }}>{v.uploaded_by}</span>
                  {v.comment && <span style={{ fontStyle: "italic", color: "var(--text-soft, #9ca3af)" }}>&quot;{v.comment}&quot;</span>}
                  {v.file_size && <span style={{ color: "var(--text-soft, #9ca3af)" }}>{Math.round(v.file_size / 1024)}KB</span>}
                  <span style={{ marginLeft: "auto", color: "var(--text-soft, #9ca3af)", fontSize: 10 }}>
                    {new Date(v.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
