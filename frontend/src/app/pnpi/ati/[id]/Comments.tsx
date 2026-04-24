"use client";

import { useState, useEffect, FormEvent } from "react";
import { useToast } from "../../../components/Toast";

interface Comment {
  id: string;
  author: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

interface Props {
  atiId: string;
  currentUsername?: string;
  canPostInternal?: boolean;
}

export function ATIComments({ atiId, currentUsername = "", canPostInternal = true }: Props) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch(`/api/pnpi/ati/${atiId}/comments`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [atiId]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/pnpi/ati/${atiId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), is_internal: isInternal && canPostInternal }),
      });
      if (res.ok) {
        setBody("");
        await load();
        showToast("Commentaire publie", "success");
      } else {
        showToast("Erreur lors de la publication", "error");
      }
    } catch {
      showToast("Erreur de connexion", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ati-comments">
      <div className="ati-comments-head">
        <h3 className="pnpi-card-subtitle">
          Commentaires &amp; discussion{" "}
          {comments.length > 0 && <span className="ati-comments-count">({comments.length})</span>}
        </h3>
      </div>

      {loading ? (
        <div className="ati-comments-loading">Chargement des commentaires...</div>
      ) : comments.length === 0 ? (
        <div className="ati-comments-empty">Aucun commentaire pour l&apos;instant.</div>
      ) : (
        <ul className="ati-comments-list">
          {comments.map((c) => {
            const isMe = currentUsername && c.author === currentUsername;
            return (
              <li
                key={c.id}
                className={`ati-comment ${c.is_internal ? "is-internal" : ""} ${isMe ? "is-me" : ""}`}
              >
                <div className="ati-comment-head">
                  <span className="ati-comment-author">{c.author}</span>
                  {c.is_internal && (
                    <span className="ati-comment-badge" title="Visible uniquement du personnel">
                      interne
                    </span>
                  )}
                  <span className="ati-comment-date">
                    {new Date(c.created_at).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="ati-comment-body">{c.body}</div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={send} className="ati-comments-form">
        <textarea
          className="pnpi-form-textarea"
          rows={3}
          placeholder={
            canPostInternal
              ? "Ecrire un commentaire ou une note interne..."
              : "Poser une question a l'instructeur..."
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
        />
        <div className="pnpi-form-actions pnpi-form-actions--between">
          {canPostInternal ? (
            <label className="pnpi-checkbox">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              <span>Note interne (invisible pour l&apos;operateur)</span>
            </label>
          ) : (
            <span className="ati-comments-hint">
              Ce commentaire sera visible de l&apos;instructeur.
            </span>
          )}
          <button type="submit" disabled={busy || !body.trim()} className="btn-primary">
            {busy ? "Envoi..." : "Publier"}
          </button>
        </div>
      </form>
    </div>
  );
}
