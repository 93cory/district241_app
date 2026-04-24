import Link from "next/link";
import { redirect } from "next/navigation";

import {
  fetchAdminUsers,
  fetchDeclarations,
  fetchFieldReports,
  fetchNotifications,
} from "../../lib/api";
import { fetchBackendProfile } from "../../lib/backend";
import { AdminActions } from "./AdminActions";
import { AdminModeration } from "./AdminModeration";
import { AdminCreateUser } from "./AdminCreateUser";
import { AdminUserImport } from "./AdminUserImport";
import { AdminUserList } from "./AdminUserList";
import { ImportOperateurs } from "./ImportOperateurs";

export default async function AdminPage() {
  let profile;
  try {
    profile = await fetchBackendProfile();
  } catch {
    redirect("/connexion");
  }
  if (!(profile.roles ?? []).includes("admin")) {
    redirect("/pilotage");
  }

  const [users, notifications, declarations, fieldReports] = await Promise.all([
    fetchAdminUsers().catch(() => []),
    fetchNotifications().catch(() => []),
    fetchDeclarations().catch(() => []),
    fetchFieldReports().catch(() => []),
  ]);

  return (
    <section className="section">
      <div className="chart-card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Administration PNPI</h2>
        <p>Gestion des comptes, roles institutionnels et notifications strategiques.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <span>
            <strong>{users.length}</strong> comptes actifs
          </span>
          <span>
            <strong>{notifications.length}</strong> notifications
          </span>
          <span>
            <strong>{fieldReports.length}</strong> rapports terrain
          </span>
          <Link href="/" style={{ marginLeft: "auto" }}>
            Retour tableau de bord
          </Link>
        </div>
      </div>

      <AdminCreateUser />
      <AdminUserImport />
      <ImportOperateurs />
      <AdminActions />
      <AdminModeration
        declarations={declarations}
        notifications={notifications}
        fieldReports={fieldReports}
      />

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div className="table-card" style={{ flex: "1 1 420px" }}>
          <AdminUserList users={users} />
        </div>

        <div className="table-card" style={{ flex: "1 1 420px" }}>
          <h3 style={{ marginTop: 0 }}>Notifications</h3>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: "0.75rem 0",
                borderBottom: "1px solid #eef1f5",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                <strong>{notification.title}</strong>
                <span style={{ color: "#6c7a8c" }}>{notification.severity}</span>
              </div>
              <p style={{ margin: "0.25rem 0", color: "#3a4351" }}>{notification.message}</p>
              <p style={{ margin: 0, color: "#6c7a8c" }}>
                Cible: {notification.target_role ?? "Tous"} |{" "}
                {new Date(notification.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
          ))}
        </div>

        <div className="table-card" style={{ flex: "1 1 420px" }}>
          <h3 style={{ marginTop: 0 }}>Rapports terrain</h3>
          {fieldReports.map((report) => (
            <div
              key={report.id}
              style={{
                padding: "0.75rem 0",
                borderBottom: "1px solid #eef1f5",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                <strong>{report.title}</strong>
                <span style={{ color: "#6c7a8c" }}>{report.status}</span>
              </div>
              <p style={{ margin: "0.25rem 0", color: "#3a4351" }}>{report.comment}</p>
              <p style={{ margin: 0, color: "#6c7a8c" }}>
                {report.location ?? "Non renseigne"} - {report.severity} - {report.created_by}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
