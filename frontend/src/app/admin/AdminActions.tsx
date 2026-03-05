"use client";

import { CSSProperties, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const severityOptions = ["info", "medium", "high", "critical"] as const;
const roleOptions = ["ministere", "industriel", "inspecteur"] as const;

export const AdminActions = () => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      username: String(data.get("username") ?? "").trim(),
      full_name: String(data.get("full_name") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      roles: [String(data.get("role") ?? "inspecteur")],
      is_active: true,
    };

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);
    if (!response.ok) {
      const errorText = await response.text();
      setMessage(`Creation utilisateur echouee: ${errorText}`);
      return;
    }
    form.reset();
    setMessage("Utilisateur cree avec succes.");
    router.refresh();
  };

  const onCreateNotification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const roleValue = String(data.get("target_role") ?? "all");
    const payload = {
      target_role: roleValue === "all" ? null : roleValue,
      title: String(data.get("title") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      severity: String(data.get("severity") ?? "info"),
    };

    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);
    if (!response.ok) {
      const errorText = await response.text();
      setMessage(`Creation notification echouee: ${errorText}`);
      return;
    }
    form.reset();
    setMessage("Notification envoyee.");
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
      <form className="table-card" style={{ flex: "1 1 420px" }} onSubmit={onCreateUser}>
        <h3 style={{ marginTop: 0 }}>Nouveau compte</h3>
        <input name="username" placeholder="username" required style={fieldStyle} />
        <input name="full_name" placeholder="Nom complet" required style={fieldStyle} />
        <input name="password" placeholder="Mot de passe" required style={fieldStyle} />
        <select name="role" defaultValue="inspecteur" style={fieldStyle}>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <button disabled={busy} className="admin-btn" type="submit">
          Creer utilisateur
        </button>
      </form>

      <form className="table-card" style={{ flex: "1 1 420px" }} onSubmit={onCreateNotification}>
        <h3 style={{ marginTop: 0 }}>Nouvelle notification</h3>
        <input name="title" placeholder="Titre" required style={fieldStyle} />
        <textarea
          name="message"
          placeholder="Message institutionnel"
          required
          rows={3}
          style={fieldStyle}
        />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select name="target_role" defaultValue="all" style={{ ...fieldStyle, marginBottom: 0 }}>
            <option value="all">Tous</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select name="severity" defaultValue="info" style={{ ...fieldStyle, marginBottom: 0 }}>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </div>
        <button disabled={busy} className="admin-btn" type="submit">
          Envoyer notification
        </button>
      </form>

      {message && (
        <div className="chart-card" style={{ width: "100%" }}>
          {message}
        </div>
      )}

      <style jsx>{`
        .admin-btn {
          border: none;
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          background: #0f2f64;
          color: white;
          cursor: pointer;
          font-weight: 600;
        }
        .admin-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
      `}</style>
    </div>
  );
};

const fieldStyle: CSSProperties = {
  width: "100%",
  marginBottom: "0.65rem",
  padding: "0.65rem",
  borderRadius: "10px",
  border: "1px solid #d8dee7",
  fontSize: "0.95rem",
};
