"use client";

interface TimelineEvent {
  type: string;
  timestamp: string;
  actor: string;
  summary: string;
  detail?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  transition: "#3b82f6",
  field_change: "#8b5cf6",
  comment: "#10b981",
  inspection: "#f59e0b",
};

const TYPE_ICONS: Record<string, string> = {
  transition: "\u2192",
  field_change: "\u270E",
  comment: "\uD83D\uDCAC",
  inspection: "\uD83D\uDD0D",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p
        style={{ color: "var(--text-secondary, #9ca3af)", textAlign: "center", padding: "1.5rem" }}
      >
        Aucun evenement
      </p>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: "2rem" }}>
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          left: "0.55rem",
          top: 0,
          bottom: 0,
          width: "2px",
          background: "var(--border-color, #e5e7eb)",
        }}
      />

      {events.map((event, i) => {
        const color = TYPE_COLORS[event.type] || "#6b7280";
        const icon = TYPE_ICONS[event.type] || "\u2022";

        return (
          <div key={i} style={{ position: "relative", marginBottom: "1.25rem" }}>
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: "-1.75rem",
                top: "0.15rem",
                width: "1.1rem",
                height: "1.1rem",
                borderRadius: "50%",
                background: color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.55rem",
                fontWeight: 700,
                border: "2px solid var(--card-bg, #fff)",
              }}
            >
              {icon}
            </div>

            {/* Content */}
            <div>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    color: "var(--text-primary, #1f2937)",
                  }}
                >
                  {event.summary}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary, #9ca3af)" }}>
                  par {event.actor}
                </span>
              </div>
              {event.detail && (
                <p
                  style={{
                    margin: "0.2rem 0 0",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary, #6b7280)",
                    lineHeight: 1.4,
                  }}
                >
                  {event.detail}
                </p>
              )}
              <time style={{ fontSize: "0.7rem", color: "var(--text-secondary, #9ca3af)" }}>
                {formatDate(event.timestamp)}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
