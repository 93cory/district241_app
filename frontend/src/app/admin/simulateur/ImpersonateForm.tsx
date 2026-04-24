"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface UserRow {
  username: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

export function ImpersonateForm({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.roles.some((r) => r.toLowerCase().includes(q))
    );
  });

  const user = users.find((u) => u.username === selected);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/impersonate/${encodeURIComponent(selected)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? `Erreur ${res.status}`);
        setBusy(false);
        return;
      }
      // Redirige vers la page d'accueil du role simule
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="pnpi-form-stack" style={{ marginTop: "1.25rem" }}>
      <div className="pnpi-form-field">
        <label htmlFor="sim-search" className="pnpi-form-label">
          Rechercher un utilisateur
        </label>
        <input
          id="sim-search"
          type="text"
          className="pnpi-form-input"
          placeholder="Nom, identifiant, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pnpi-form-field">
        <label htmlFor="sim-user" className="pnpi-form-label pnpi-form-label-req">
          Utilisateur a simuler ({filtered.length} compte{filtered.length > 1 ? "s" : ""} actifs)
        </label>
        <select
          id="sim-user"
          className="pnpi-form-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          required
          size={Math.min(Math.max(filtered.length, 6), 12)}
        >
          <option value="" disabled>
            -- Selectionner --
          </option>
          {filtered.map((u) => (
            <option key={u.username} value={u.username}>
              {u.full_name} ({u.username}) &middot; {u.roles.join(", ")}
            </option>
          ))}
        </select>
      </div>

      {user && (
        <div className="pnpi-form-alert pnpi-form-alert--info" role="status">
          <div>
            <strong>Vous allez simuler</strong>
            <p style={{ margin: "0.25rem 0 0" }}>
              {user.full_name} <span className="pnpi-mono">({user.username})</span> &middot; roles :{" "}
              {user.roles.join(", ")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="pnpi-form-actions">
        <button type="submit" disabled={busy || !selected} className="btn-primary">
          {busy ? "Demarrage..." : "Demarrer la simulation"}
        </button>
      </div>
    </form>
  );
}
