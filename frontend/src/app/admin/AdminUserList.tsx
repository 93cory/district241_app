"use client";

import { useState } from "react";
import { AdminEditUser } from "./AdminEditUser";

interface UserRow {
  username: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

export function AdminUserList({ users }: { users: UserRow[] }) {
  const [editing, setEditing] = useState<UserRow | null>(null);

  return (
    <>
      <h3 style={{ marginTop: 0 }}>Utilisateurs</h3>
      {users.map((user) => (
        <div
          key={user.username}
          style={{
            padding: "0.75rem 0",
            borderBottom: "1px solid #eef1f5",
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div>
            <strong>{user.full_name}</strong>
            <p style={{ margin: "0.25rem 0", color: "#3a4351" }}>@{user.username}</p>
            <p style={{ margin: 0, color: "#6c7a8c" }}>{user.roles.join(", ")}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                color: user.is_active ? "#0f6b3f" : "#bf1a1a",
                fontWeight: 600,
              }}
            >
              {user.is_active ? "Actif" : "Inactif"}
            </span>
            <button
              onClick={() => setEditing(user)}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border: "1px solid #dce4ef",
                background: "transparent",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Modifier
            </button>
          </div>
        </div>
      ))}

      {editing && (
        <AdminEditUser
          user={{
            username: editing.username,
            full_name: editing.full_name,
            roles_csv: editing.roles.join(","),
            is_active: editing.is_active,
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
