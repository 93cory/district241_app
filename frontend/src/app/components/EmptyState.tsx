interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
}

export function EmptyState({
  title = "Aucun resultat",
  message = "Aucune donnee a afficher pour le moment.",
  icon = "📭",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
        color: "var(--text-secondary, #6b7280)",
      }}
    >
      <span style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{icon}</span>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary, #1f2937)", marginBottom: "0.4rem" }}>
        {title}
      </h3>
      <p style={{ fontSize: "0.85rem", maxWidth: "360px", lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}
