"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../components/Toast";

const ALL_ROLES = ["admin", "ministre", "directeur", "instructeur", "inspecteur", "operateur"];

interface Props {
  user: { username: string; full_name: string; roles_csv: string; is_active: boolean };
  onClose: () => void;
}

export function AdminEditUser({ user, onClose }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(user.full_name);
  const [roles, setRoles] = useState<string[]>(user.roles_csv.split(",").filter(Boolean));
  const [isActive, setIsActive] = useState(user.is_active);
  const [saving, setSaving] = useState(false);

  const toggleRole = (role: string) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleSave = async () => {
    if (!roles.length) {
      showToast("Au moins un role requis", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, roles: roles, is_active: isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.detail || "Erreur", "error");
        return;
      }
      showToast("Utilisateur modifie", "success");
      onClose();
      router.refresh();
    } catch {
      showToast("Erreur de connexion", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--bg-layer, #fff)",
          borderRadius: 20,
          padding: 28,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>
          Modifier {user.username}
        </h3>

        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Nom complet
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 14,
            border: "1.5px solid var(--line, #dce4ef)",
            marginBottom: 14,
            boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
          Roles
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {ALL_ROLES.map((role) => (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                border: "1.5px solid",
                borderColor: roles.includes(role) ? "#006233" : "var(--line, #dce4ef)",
                background: roles.includes(role) ? "#006233" : "transparent",
                color: roles.includes(role) ? "#fff" : "var(--text-soft, #526175)",
                cursor: "pointer",
              }}
            >
              {role}
            </button>
          ))}
        </div>

        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Compte actif
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid var(--line, #dce4ef)",
              background: "transparent",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: "#006233",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
