"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../../../components/Toast";

interface UserRow {
  username: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

export default function NewMessagePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [recipient, setRecipient] = useState(params.get("to") ?? "");
  const [query, setQuery] = useState(params.get("to") ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);

  // Charge la liste des users (ceux enregistres dans la plateforme)
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: UserRow[]) => {
        if (Array.isArray(data)) setUsers(data.filter((u) => u.is_active));
      })
      .catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return users.slice(0, 12);
    const q = query.toLowerCase();
    return users
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q) ||
          u.roles?.some((r) => r.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [query, users]);

  const pick = (u: UserRow) => {
    setRecipient(u.username);
    setQuery(`${u.full_name} (${u.username})`);
    setOpen(false);
  };

  const send = () => {
    if (!recipient || !subject || !body) {
      showToast("Veuillez remplir tous les champs", "warning");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient, subject, body }),
        });
        if (res.ok) {
          showToast("Message envoye", "success");
          router.push("/pnpi/messages");
        } else {
          const data = await res.json().catch(() => ({}));
          showToast(data.detail || "Erreur d'envoi", "error");
        }
      } catch {
        showToast("Erreur de connexion", "error");
      }
    });
  };

  return (
    <section className="section">
      <div className="chart-card msg-new">
        <h1 className="pnpi-card-subtitle">Nouveau message</h1>

        <div className="pnpi-form-stack">
          <div className="pnpi-form-field msg-new-recipient">
            <label htmlFor="msg-to" className="pnpi-form-label pnpi-form-label-req">
              Destinataire
            </label>
            <input
              id="msg-to"
              className="pnpi-form-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setRecipient("");
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
              placeholder="Tapez un nom, identifiant ou role..."
              autoComplete="off"
            />
            {open && suggestions.length > 0 && (
              <div className="msg-new-suggestions" role="listbox" aria-label="Liste des destinataires">
                {suggestions.map((u) => (
                  <button
                    type="button"
                    key={u.username}
                    role="option"
                    aria-selected={recipient === u.username ? "true" : "false"}
                    className={`msg-new-option ${recipient === u.username ? "is-selected" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(u);
                    }}
                  >
                    <span className="msg-new-option-name">{u.full_name}</span>
                    <span className="msg-new-option-meta">
                      @{u.username}
                      {u.roles?.length ? ` · ${u.roles.join(", ")}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {recipient && !open && (
              <div className="msg-new-picked">Selectionne : <strong>{recipient}</strong></div>
            )}
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="msg-subject" className="pnpi-form-label pnpi-form-label-req">Sujet</label>
            <input
              id="msg-subject"
              className="pnpi-form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
            />
          </div>

          <div className="pnpi-form-field">
            <label htmlFor="msg-body" className="pnpi-form-label pnpi-form-label-req">Message</label>
            <textarea
              id="msg-body"
              className="pnpi-form-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Contenu du message..."
            />
          </div>

          <div className="pnpi-form-actions">
            <button onClick={send} disabled={pending || !recipient} className="btn-primary">
              {pending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
