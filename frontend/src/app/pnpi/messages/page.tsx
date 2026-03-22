import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  let inbox: any = { messages: [], unread_count: 0 };
  try {
    const res = await backendRequest("/messages/inbox?limit=30");
    if (res.ok) inbox = await res.json();
  } catch {}

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Messagerie</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-soft, #526175)" }}>
            {inbox.unread_count} message(s) non lu(s)
          </p>
        </div>
        <a
          href="/pnpi/messages/new"
          style={{
            padding: "8px 20px", borderRadius: 10, border: "none",
            background: "#006233", color: "#fff", fontWeight: 700,
            textDecoration: "none", fontSize: 13,
          }}
        >
          + Nouveau message
        </a>
      </div>

      {inbox.messages.length === 0 ? (
        <div className="chart-card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>&#x1f4ed;</div>
          <div style={{ fontWeight: 600 }}>Aucun message</div>
          <div style={{ fontSize: 13, color: "var(--text-soft, #526175)" }}>
            Votre boite de reception est vide.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {inbox.messages.map((m: any) => (
            <a
              key={m.id}
              href={`/pnpi/messages/thread/${m.thread_id}`}
              style={{
                display: "flex", gap: 12, alignItems: "center",
                padding: "12px 16px", borderRadius: 12,
                background: m.is_read ? "var(--bg-layer, #fff)" : "rgba(0, 98, 51, 0.05)",
                border: `1.5px solid ${m.is_read ? "var(--line, #dce4ef)" : "#006233"}`,
                textDecoration: "none", color: "inherit",
                transition: "all 150ms ease",
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: m.is_read ? "transparent" : "#006233",
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.sender}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-soft, #526175)", whiteSpace: "nowrap" }}>
                    {new Date(m.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: m.is_read ? 400 : 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.subject}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-soft, #526175)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.body}
                </div>
              </div>
              {m.ati_id && (
                <span style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: "rgba(12, 126, 180, 0.1)", color: "#0c7eb4",
                }}>
                  ATI
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
