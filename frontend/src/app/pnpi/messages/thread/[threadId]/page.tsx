import Link from "next/link";
import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

interface Props {
  params: { threadId: string };
}

interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_username: string;
  sender_full_name?: string;
  body: string;
  sent_at: string;
}

interface ThreadPayload {
  thread_id: string;
  subject?: string;
  messages: ThreadMessage[];
}

export default async function MessageThreadPage({ params }: Props) {
  let thread: ThreadPayload = { thread_id: params.threadId, messages: [] };
  try {
    const res = await backendRequest(
      `/messages/thread/${encodeURIComponent(params.threadId)}?limit=200`,
    );
    if (res.ok) thread = await res.json();
  } catch {
    /* fallback to empty */
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 18, fontSize: 13 }}>
        <Link href="/pnpi/messages" style={{ color: "#6b7280", textDecoration: "none" }}>
          &larr; Retour a la messagerie
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
        {thread.subject || "Conversation"}
      </h1>
      <p style={{ margin: "0 0 18px", fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>
        {thread.thread_id}
      </p>

      {thread.messages.length === 0 ? (
        <div className="chart-card" style={{ padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>&#x1f4ec;</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Conversation vide</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Aucun message disponible pour cette discussion.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {thread.messages.map((m) => (
            <article
              key={m.id}
              className="chart-card"
              style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                <strong style={{ color: "#111827", fontWeight: 700 }}>
                  {m.sender_full_name || m.sender_username}
                </strong>
                <time>{new Date(m.sent_at).toLocaleString("fr-FR")}</time>
              </header>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "#1f2937" }}>{m.body}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
