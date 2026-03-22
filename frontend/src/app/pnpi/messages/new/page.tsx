"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../../components/Toast";

export default function NewMessagePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

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
          const data = await res.json();
          showToast(data.detail || "Erreur d'envoi", "error");
        }
      } catch {
        showToast("Erreur de connexion", "error");
      }
    });
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Nouveau message</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Destinataire</label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Nom d'utilisateur"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--line, #dce4ef)", fontSize: 14 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Sujet</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet du message"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--line, #dce4ef)", fontSize: 14 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Contenu du message..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--line, #dce4ef)", fontSize: 14, resize: "vertical" }}
          />
        </div>
        <button
          onClick={send}
          disabled={pending}
          style={{
            padding: "10px 24px", borderRadius: 12, border: "none",
            background: "#006233", color: "#fff", fontWeight: 700,
            cursor: "pointer", opacity: pending ? 0.6 : 1, alignSelf: "flex-end",
          }}
        >
          {pending ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
