"use client";

interface Transition {
  id: string;
  changed_by: string;
  previous_statut: string | null;
  new_statut: string | null;
  previous_etape: string | null;
  new_etape: string | null;
  note: string;
  changed_at: string;
}

interface Props {
  transitions: Transition[];
}

const STATUS_COLORS: Record<string, string> = {
  soumis: "#f2b800",
  en_instruction: "#0d3f78",
  en_validation: "#0c7eb4",
  approuve: "#006233",
  rejete: "#b42318",
  expire: "#526175",
};

const STATUS_LABELS: Record<string, string> = {
  soumis: "Soumis",
  en_instruction: "En instruction",
  en_validation: "En validation",
  approuve: "Approuve",
  rejete: "Rejete",
  expire: "Expire",
};

export function ATITimeline({ transitions }: Props) {
  if (!transitions.length) {
    return (
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14 }}>
        Aucune transition enregistree.
      </p>
    );
  }

  const sorted = [...transitions].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
  );

  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 8,
          bottom: 8,
          width: 2,
          background: "var(--line, #dce4ef)",
        }}
      />

      {sorted.map((t, i) => {
        const color = STATUS_COLORS[t.new_statut || ""] || "#526175";
        const date = new Date(t.changed_at);
        const dateStr = date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

        return (
          <div key={t.id} style={{ position: "relative", marginBottom: 20, paddingLeft: 20 }}>
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: -22,
                top: 4,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: color,
                border: "3px solid var(--bg-layer, #fff)",
                boxShadow: `0 0 0 2px ${color}40`,
              }}
            />

            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--bg-base, #f4f8fb)",
                border: `1px solid var(--line, #dce4ef)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {t.previous_statut && (
                    <>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: `${STATUS_COLORS[t.previous_statut] || "#526175"}20`,
                          color: STATUS_COLORS[t.previous_statut] || "#526175",
                        }}
                      >
                        {STATUS_LABELS[t.previous_statut] || t.previous_statut}
                      </span>
                      <span style={{ color: "var(--text-soft, #526175)", fontSize: 13 }}>
                        &rarr;
                      </span>
                    </>
                  )}
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: color,
                      color: "#fff",
                    }}
                  >
                    {STATUS_LABELS[t.new_statut || ""] || t.new_statut || "\u2014"}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>
                  {dateStr} a {timeStr}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
                Par <strong>{t.changed_by}</strong>
                {t.note && <span> &mdash; {t.note}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
