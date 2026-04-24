import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "ati.create": "ATI cree",
  "ati.transition": "Transition ATI",
  "ati.certificate": "Certificat telecharge",
  "ati.sign_certificate": "Certificat signe",
  "ati.field_change": "Modification ATI",
  "inspection.create": "Inspection creee",
  "inspection.report_pdf": "Rapport PDF",
  "auth.login": "Connexion",
  "auth.login_failed": "Echec connexion",
  "admin.user_create": "Utilisateur cree",
  "export.xlsx": "Export Excel",
  "export.pdf": "Export PDF",
  "export.pptx": "Export PowerPoint",
  "export.zip": "Export ZIP",
  "operateurs.import_csv": "Import CSV",
};

export default async function ActivityPage() {
  let events: any[] = [];
  try {
    const res = await backendRequest("/pnpi/dashboard/activity-feed?limit=40");
    if (res.ok) {
      const d = await res.json();
      events = d.events || [];
    }
  } catch {}

  const now = new Date();
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "A l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString("fr-FR");
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Activite recente</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        Dernieres actions sur la plateforme PNPI.
      </p>

      <div style={{ position: "relative", paddingLeft: 24 }}>
        {/* Timeline line */}
        <div
          style={{
            position: "absolute",
            left: 7,
            top: 0,
            bottom: 0,
            width: 2,
            background: "var(--line, #dce4ef)",
          }}
        />

        {events.map((ev) => (
          <div
            key={ev.id}
            style={{
              position: "relative",
              marginBottom: 12,
              paddingLeft: 20,
            }}
          >
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: -5,
                top: 4,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "var(--bg-layer, #fff)",
                border: "2px solid var(--line, #dce4ef)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
              }}
            >
              {ev.icon}
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--bg-layer, #fff)",
                border: "1px solid var(--line, #dce4ef)",
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span>
                  <strong>{ev.actor}</strong>
                  {" · "}
                  <span style={{ color: "var(--accent, #006233)", fontWeight: 600 }}>
                    {ACTION_LABELS[ev.action] || ev.action}
                  </span>
                </span>
                <span
                  style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)", whiteSpace: "nowrap" }}
                >
                  {formatTime(ev.timestamp)}
                </span>
              </div>
              {ev.details && (
                <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>{ev.details}</div>
              )}
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-soft)" }}>
            Aucune activite recente.
          </div>
        )}
      </div>
    </div>
  );
}
