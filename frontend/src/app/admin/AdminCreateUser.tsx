"use client";
import { useState, FormEvent } from "react";

const PNPI_ROLES = ["admin", "ministre", "directeur", "instructeur", "inspecteur", "operateur"];
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur", ministre: "Ministre", directeur: "Directeur",
  instructeur: "Instructeur", inspecteur: "Inspecteur", operateur: "Operateur",
};
const ROLE_COLORS: Record<string, string> = {
  admin: "#7c3aed", ministre: "#003F8F", directeur: "#1d4ed8", instructeur: "#0284c7",
  inspecteur: "#059669", operateur: "#d97706",
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export function AdminCreateUser({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleRole = (r: string) => {
    setSelectedRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const reset = () => {
    setUsername(""); setFullName(""); setPassword(""); setSelectedRoles([]);
    setError(null); setSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRoles.length) { setError("Selectionnez au moins un role."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${BACKEND}/admin/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, full_name: fullName, password, roles: selectedRoles, is_active: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? `Erreur ${res.status}`); return; }
      setSuccess(`Compte @${username} cree avec succes !`);
      reset();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "0.5rem 1rem", background: "#003F8F", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
      >
        + Nouvel utilisateur
      </button>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #d1d5db", borderRadius: "6px",
    padding: "0.5rem 0.75rem", fontSize: "0.875rem", boxSizing: "border-box",
    background: "#fafafa", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
  };

  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, color: "#003F8F", fontSize: "1rem" }}>Creer un utilisateur PNPI</h3>
        <button onClick={() => { setOpen(false); reset(); }} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
      </div>

      {error && (
        <div style={{ padding: "0.625rem 0.875rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", color: "#b42318", fontSize: "0.82rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "0.625rem 0.875rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#166534", fontSize: "0.82rem", marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "0.875rem" }}>
          <div>
            <label style={labelStyle}>Nom d&apos;utilisateur *</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="ex: j.martin" style={inputStyle} autoComplete="off" />
          </div>
          <div>
            <label style={labelStyle}>Nom complet *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="ex: Jean Martin" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: "0.875rem" }}>
          <label style={labelStyle}>Mot de passe *</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 caracteres" style={inputStyle} autoComplete="new-password" />
          <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.25rem" }}>Doit contenir majuscule, minuscule et chiffre.</div>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Roles habilites *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {PNPI_ROLES.map(r => {
              const active = selectedRoles.includes(r);
              return (
                <button
                  key={r} type="button"
                  onClick={() => toggleRole(r)}
                  style={{
                    padding: "0.25rem 0.65rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                    background: active ? `${ROLE_COLORS[r]}18` : "#f3f4f6",
                    color: active ? ROLE_COLORS[r] : "#6b7280",
                    border: active ? `1.5px solid ${ROLE_COLORS[r]}40` : "1.5px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  {ROLE_LABELS[r] ?? r}
                </button>
              );
            })}
          </div>
          {selectedRoles.length > 0 && (
            <div style={{ marginTop: "0.375rem", fontSize: "0.72rem", color: "#6b7280" }}>
              Roles selectionnes : {selectedRoles.join(", ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit" disabled={busy}
            style={{ flex: 1, padding: "0.6rem", background: busy ? "#9ca3af" : "#003F8F", color: "white", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "0.875rem", cursor: busy ? "not-allowed" : "pointer" }}
          >
            {busy ? "Creation en cours..." : "Creer le compte"}
          </button>
          <button
            type="button" onClick={() => { setOpen(false); reset(); }}
            style={{ padding: "0.6rem 1rem", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
