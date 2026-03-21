"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User { username: string; full_name: string; roles: string[]; is_active: boolean; }

export function AssignInstructeur({ atiId, currentInstructeur }: { atiId: string; currentInstructeur: string | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState(currentInstructeur ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.resolve([]))
      .then((all: User[]) => setUsers(all.filter(u => u.is_active && u.roles.some(r => ["instructeur", "admin", "directeur"].includes(r)))))
      .catch(() => { /* ignore -- non-admin */ });
  }, []);

  const handleAssign = async () => {
    setBusy(true); setError(null); setSuccess(false);
    try {
      const res = await fetch(`/api/ati/${encodeURIComponent(atiId)}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructeur_username: selected || null, note: `Assignation instructeur: ${selected || "aucun"}` }),
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.detail ?? `Erreur ${res.status}`); return; }
      setSuccess(true);
      setTimeout(() => { setSuccess(false); router.refresh(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "1rem 1.25rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Instructeur assigne
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setSuccess(false); }}
          style={{
            flex: "1 1 160px", border: "1px solid #d1d5db", borderRadius: "6px",
            padding: "0.45rem 0.75rem", fontSize: "0.82rem", background: "white", outline: "none",
          }}
        >
          <option value="">-- Non assigne --</option>
          {users.map(u => (
            <option key={u.username} value={u.username}>
              {u.full_name || u.username} (@{u.username})
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign} disabled={busy || selected === currentInstructeur}
          style={{
            padding: "0.45rem 0.875rem", background: busy ? "#9ca3af" : "#003F8F",
            color: "white", border: "none", borderRadius: "6px", fontWeight: 600,
            fontSize: "0.8rem", cursor: busy || selected === currentInstructeur ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {busy ? "..." : success ? "Assigne" : "Assigner"}
        </button>
      </div>
      {error && <div style={{ marginTop: "0.5rem", color: "#b42318", fontSize: "0.78rem" }}>{error}</div>}
      {success && <div style={{ marginTop: "0.5rem", color: "#10b981", fontSize: "0.78rem" }}>Instructeur mis a jour.</div>}
    </div>
  );
}
