"use client";

import { useState, useTransition } from "react";
import { useToast } from "../components/Toast";

export function ChangePasswordForm() {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!currentPwd) errs.current = "Mot de passe actuel requis";
    if (newPwd.length < 12) errs.new = "Minimum 12 caracteres";
    else if (!/[A-Z]/.test(newPwd)) errs.new = "Au moins une majuscule";
    else if (!/[a-z]/.test(newPwd)) errs.new = "Au moins une minuscule";
    else if (!/[0-9]/.test(newPwd)) errs.new = "Au moins un chiffre";
    else if (!/[^A-Za-z0-9]/.test(newPwd)) errs.new = "Au moins un caractere special";
    if (newPwd !== confirmPwd) errs.confirm = "Les mots de passe ne correspondent pas";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");

    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("current_password", currentPwd);
        form.set("new_password", newPwd);
        const res = await fetch("/api/auth/change-password", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Erreur lors du changement de mot de passe");
          return;
        }
        showToast("Mot de passe modifie avec succes", "success");
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
        setFieldErrors({});
      } catch {
        setError("Erreur de connexion au serveur");
      }
    });
  };

  const inputStyle = (field: string) => ({
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 14,
    border: `1.5px solid ${fieldErrors[field] ? "#b42318" : "#dce4ef"}`,
    background: fieldErrors[field] ? "#fff5f5" : "#f6f8fb",
    boxSizing: "border-box" as const,
  });

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Changer le mot de passe</h3>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fff5f5",
            color: "#b42318",
            fontSize: 13,
            marginBottom: 14,
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Mot de passe actuel
        </label>
        <input
          type="password"
          value={currentPwd}
          onChange={(e) => setCurrentPwd(e.target.value)}
          style={inputStyle("current")}
        />
        {fieldErrors.current && (
          <span style={{ fontSize: 12, color: "#b42318" }}>{fieldErrors.current}</span>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Nouveau mot de passe
        </label>
        <input
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          style={inputStyle("new")}
        />
        {fieldErrors.new && (
          <span style={{ fontSize: 12, color: "#b42318" }}>{fieldErrors.new}</span>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Confirmer le nouveau mot de passe
        </label>
        <input
          type="password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          style={inputStyle("confirm")}
        />
        {fieldErrors.confirm && (
          <span style={{ fontSize: 12, color: "#b42318" }}>{fieldErrors.confirm}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "10px 24px",
          borderRadius: 12,
          border: "none",
          background: "#006233",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Modification..." : "Changer le mot de passe"}
      </button>
    </form>
  );
}
