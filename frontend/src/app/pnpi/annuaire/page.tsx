import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

const ROLE_STYLES: Record<string, { color: string; label: string }> = {
  admin: { color: "#b42318", label: "Admin" },
  ministre: { color: "#051B36", label: "Ministre" },
  directeur: { color: "#006233", label: "Directeur" },
  instructeur: { color: "#0c7eb4", label: "Instructeur" },
  inspecteur: { color: "#7c3aed", label: "Inspecteur" },
  operateur: { color: "#d97706", label: "Operateur" },
};

export default async function AnnuairePage() {
  let users: any[] = [];
  try {
    const res = await backendRequest("/admin/users");
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
      users = list.filter((u: any) => u.is_active);
    }
  } catch {}

  // Group by role · /admin/users retourne un array de roles, /auth/me aussi.
  // Anciennement : roles_csv string separee par virgules. On supporte les deux.
  const byRole: Record<string, any[]> = {};
  for (const user of users) {
    const rawRoles = user.roles;
    let roles: string[];
    if (Array.isArray(rawRoles)) {
      roles = rawRoles.filter(Boolean);
    } else if (typeof rawRoles === "string") {
      roles = rawRoles.split(",").map((r: string) => r.trim()).filter(Boolean);
    } else if (typeof user.roles_csv === "string") {
      roles = user.roles_csv.split(",").map((r: string) => r.trim()).filter(Boolean);
    } else {
      roles = [];
    }
    const primaryRole = roles[0] || "autre";
    if (!byRole[primaryRole]) byRole[primaryRole] = [];
    byRole[primaryRole].push({ ...user, roles });
  }

  const roleOrder = ["ministre", "directeur", "instructeur", "inspecteur", "operateur", "admin"];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Annuaire interne</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        {users.length} utilisateur(s) actif(s) sur la plateforme PNPI.
      </p>

      {roleOrder.map(role => {
        const roleUsers = byRole[role];
        if (!roleUsers || roleUsers.length === 0) return null;
        const style = ROLE_STYLES[role] || { color: "#526175", label: role };

        return (
          <div key={role} style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 8, paddingBottom: 6,
              borderBottom: `2px solid ${style.color}`,
            }}>
              <span style={{
                padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: `${style.color}12`, color: style.color,
              }}>
                {style.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)" }}>
                {roleUsers.length} personne(s)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 }}>
              {roleUsers.map((user: any) => (
                <div key={user.username} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  background: "var(--bg-layer, #fff)",
                  border: "1px solid var(--line, #dce4ef)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${style.color}15`, color: style.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800,
                  }}>
                    {(user.full_name || user.username || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.full_name || user.username}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>
                      @{user.username}
                      {user.province && <span> · {user.province.replace("_", " ")}</span>}
                    </div>
                  </div>
                  <a href={`/pnpi/messages/new?to=${user.username}`} style={{
                    padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: "var(--bg-base, #f4f8fb)", color: "var(--text-soft, #526175)",
                    textDecoration: "none", border: "1px solid var(--line, #dce4ef)",
                  }}>
                    Message
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
