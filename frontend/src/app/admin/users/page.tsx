import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchBackendProfile } from "../../../lib/backend";
import { AdminCreateUser } from "../AdminCreateUser";
import { AdminUserImport } from "../AdminUserImport";
import { AdminUserList } from "../AdminUserList";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gestion des utilisateurs · PNPI",
  description: "Administration des comptes utilisateurs de la plateforme PNPI.",
};

interface UserRow {
  username: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

async function fetchUsers(): Promise<UserRow[]> {
  try {
    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/admin/users`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
  } catch {
    return [];
  }
}

export default async function AdminUsersPage() {
  let profile: { username: string; full_name: string; roles: string[] } | null = null;
  try {
    profile = await fetchBackendProfile();
  } catch {
    redirect("/connexion");
  }
  if (!profile?.roles?.includes("admin")) {
    redirect("/");
  }

  const users = await fetchUsers();

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px" }}>
      <nav style={{ fontSize: 13, color: "#526175", marginBottom: 18 }} aria-label="Fil d'Ariane">
        <Link href="/admin" style={{ color: "#526175", textDecoration: "none" }}>
          ← Administration
        </Link>
        <span style={{ margin: "0 8px" }}>·</span>
        <span style={{ color: "#051B36", fontWeight: 600 }}>Utilisateurs</span>
      </nav>

      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 32,
            fontWeight: 800,
            margin: "0 0 8px",
            color: "#051B36",
            letterSpacing: "-0.01em",
          }}
        >
          Gestion des utilisateurs
        </h1>
        <p style={{ fontSize: 15, color: "#526175", maxWidth: 720, lineHeight: 1.6 }}>
          Création, édition, désactivation des comptes. Import en masse via fichier CSV. Toutes les
          actions sont tracées dans le journal d'audit.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 1fr) minmax(300px, 1fr)",
          gap: 20,
          marginBottom: 28,
        }}
      >
        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "22px 24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 14px",
              color: "#051B36",
            }}
          >
            Créer un utilisateur
          </h2>
          <AdminCreateUser />
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "22px 24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 14px",
              color: "#051B36",
            }}
          >
            Import CSV en masse
          </h2>
          <AdminUserImport />
        </section>
      </div>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "22px 28px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 700,
              margin: 0,
              color: "#051B36",
            }}
          >
            Comptes existants
          </h2>
          <span style={{ fontSize: 13, color: "#526175" }}>
            {users.length} compte{users.length > 1 ? "s" : ""}
          </span>
        </div>
        {users.length === 0 ? (
          <p
            style={{
              fontSize: 14,
              color: "#94a3b8",
              padding: "24px 0",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            Aucun utilisateur disponible. Vérifiez que vous êtes bien connecté en tant
            qu'administrateur.
          </p>
        ) : (
          <AdminUserList users={users} />
        )}
      </section>
    </main>
  );
}
