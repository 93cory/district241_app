"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../../components/Toast";

interface Comment {
  id: string;
  author: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export function ATIComments({ atiId }: { atiId: string }) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => {
    fetch(`/api/pnpi/ati/${atiId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments || []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, [atiId]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/pnpi/ati/${atiId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, is_internal: isInternal }),
      });
      if (res.ok) {
        setBody("");
        load();
        showToast("Commentaire ajoute", "success");
      } else {
        showToast("Erreur", "error");
      }
    } catch {
      showToast("Erreur de connexion", "error");
    }
    setSending(false);
  };

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
        Commentaires ({comments.length})
      </h3>

      {comments.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text-soft, #526175)", marginBottom: 14 }}>
          Aucun commentaire sur ce dossier.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              padding: "10px 14px", borderRadius: 12,
              background: c.is_internal ? "rgba(124, 58, 237, 0.06)" : "var(--bg-base, #f4f8fb)",
              borderLeft: `3px solid ${c.is_internal ? "#7c3aed" : "var(--accent, #006233)"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {c.author}
                {c.is_internal && (
                  <span style={{
                    marginLeft: 6, padding: "1px 6px", borderRadius: 4,
                    fontSize: 10, fontWeight: 700, background: "#f3e8ff", color: "#7c3aed",
                  }}>
                    Interne
                  </span>
                )}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
                {new Date(c.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.body}</div>
          </div>
        ))}
      </div>

      {/* New comment form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ajouter un commentaire..."
          rows={3}
          style={{
            padding: "10px 14px", borderRadius: 10,
            border: "1.5px solid var(--line, #dce4ef)",
            fontSize: 13, resize: "vertical",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              style={{ accentColor: "#7c3aed" }}
            />
            Note interne (invisible pour l&apos;operateur)
          </label>
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            style={{
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: "#006233", color: "#fff", fontWeight: 600,
              fontSize: 13, cursor: "pointer",
              opacity: sending || !body.trim() ? 0.5 : 1,
            }}
          >
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
