"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FieldReport, Notification, ProductionDeclaration } from "../../lib/api";

interface Props {
  declarations: ProductionDeclaration[];
  notifications: Notification[];
  fieldReports: FieldReport[];
}

export const AdminModeration = ({ declarations, notifications, fieldReports }: Props) => {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pendingDeclarations = declarations.filter((entry) => !entry.validated);
  const unreadNotifications = notifications.filter((entry) => !entry.is_read);
  const openReports = fieldReports.filter((entry) => entry.status !== "closed");

  const validateDeclaration = async (declarationId: string) => {
    setBusyId(declarationId);
    setMessage(null);
    const response = await fetch("/api/admin/declarations/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ declaration_id: declarationId, validated: true }),
    });
    setBusyId(null);
    if (!response.ok) {
      setMessage(`Validation echouee (${response.status}).`);
      return;
    }
    setMessage("Declaration validee.");
    router.refresh();
  };

  const markNotificationRead = async (notificationId: string) => {
    setBusyId(notificationId);
    setMessage(null);
    const response = await fetch("/api/admin/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_id: notificationId, is_read: true }),
    });
    setBusyId(null);
    if (!response.ok) {
      setMessage(`Mise a jour notification echouee (${response.status}).`);
      return;
    }
    setMessage("Notification marquee comme lue.");
    router.refresh();
  };

  const changeFieldReportStatus = async (reportId: string, status: string) => {
    setBusyId(reportId);
    setMessage(null);
    const response = await fetch("/api/admin/field-reports/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: reportId, status }),
    });
    setBusyId(null);
    if (!response.ok) {
      setMessage(`Mise a jour rapport echouee (${response.status}).`);
      return;
    }
    setMessage("Statut rapport terrain mis a jour.");
    router.refresh();
  };

  const deleteFieldReport = async (reportId: string) => {
    setBusyId(reportId);
    setMessage(null);
    const response = await fetch("/api/admin/field-reports/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: reportId }),
    });
    setBusyId(null);
    if (!response.ok) {
      setMessage(`Suppression rapport echouee (${response.status}).`);
      return;
    }
    setMessage("Rapport terrain supprime.");
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
      <div className="table-card" style={{ flex: "1 1 420px" }}>
        <h3 style={{ marginTop: 0 }}>Declarations en attente</h3>
        {pendingDeclarations.length === 0 ? (
          <p style={{ color: "#6c7a8c", margin: 0 }}>Aucune declaration en attente.</p>
        ) : (
          pendingDeclarations.map((declaration) => (
            <div
              key={declaration.id}
              style={{
                padding: "0.75rem 0",
                borderBottom: "1px solid #eef1f5",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <div>
                <strong>{declaration.id}</strong>
                <p style={{ margin: "0.25rem 0", color: "#3a4351" }}>
                  {declaration.volume_tons.toFixed(1)} T - {declaration.jobs} emplois
                </p>
                <p style={{ margin: 0, color: "#6c7a8c" }}>Soumis par {declaration.submitted_by}</p>
              </div>
              <button
                className="action-btn"
                disabled={busyId === declaration.id}
                onClick={() => validateDeclaration(declaration.id)}
              >
                Valider
              </button>
            </div>
          ))
        )}
      </div>

      <div className="table-card" style={{ flex: "1 1 420px" }}>
        <h3 style={{ marginTop: 0 }}>Notifications non lues</h3>
        {unreadNotifications.length === 0 ? (
          <p style={{ color: "#6c7a8c", margin: 0 }}>Aucune notification non lue.</p>
        ) : (
          unreadNotifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: "0.75rem 0",
                borderBottom: "1px solid #eef1f5",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <div>
                <strong>{notification.title}</strong>
                <p style={{ margin: "0.25rem 0", color: "#3a4351" }}>{notification.message}</p>
                <p style={{ margin: 0, color: "#6c7a8c" }}>Cible: {notification.target_role ?? "Tous"}</p>
              </div>
              <button
                className="action-btn"
                disabled={busyId === notification.id}
                onClick={() => markNotificationRead(notification.id)}
              >
                Marquer lue
              </button>
            </div>
          ))
        )}
      </div>

      <div className="table-card" style={{ flex: "1 1 860px" }}>
        <h3 style={{ marginTop: 0 }}>Rapports terrain ouverts</h3>
        {openReports.length === 0 ? (
          <p style={{ color: "#6c7a8c", margin: 0 }}>Aucun rapport ouvert.</p>
        ) : (
          openReports.map((report) => (
            <div
              key={report.id}
              style={{
                padding: "0.75rem 0",
                borderBottom: "1px solid #eef1f5",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{report.title}</strong>
                <p style={{ margin: "0.25rem 0", color: "#3a4351" }}>{report.comment}</p>
                <p style={{ margin: 0, color: "#6c7a8c" }}>
                  {report.location ?? "Non renseigne"} - {report.severity} - {report.status} - {report.created_by}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  className="action-btn"
                  disabled={busyId === report.id}
                  onClick={() => changeFieldReportStatus(report.id, "in_progress")}
                >
                  En cours
                </button>
                <button
                  className="action-btn"
                  disabled={busyId === report.id}
                  onClick={() => changeFieldReportStatus(report.id, "closed")}
                >
                  Cloturer
                </button>
                <button
                  className="action-btn danger"
                  disabled={busyId === report.id}
                  onClick={() => deleteFieldReport(report.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {message && (
        <div className="chart-card" style={{ width: "100%" }}>
          {message}
        </div>
      )}

      <style jsx>{`
        .action-btn {
          border: none;
          border-radius: 10px;
          padding: 0.55rem 0.8rem;
          background: #0f2f64;
          color: white;
          cursor: pointer;
          align-self: center;
          font-weight: 600;
          white-space: nowrap;
        }
        .danger {
          background: #b42318;
        }
        .action-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
      `}</style>
    </div>
  );
};
