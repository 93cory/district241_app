interface StatusBadgeProps {
  statut: string;
  size?: "sm" | "md";
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumis: { label: "Soumis", color: "#92400e", bg: "#fef3c7" },
  en_instruction: { label: "En instruction", color: "#1e40af", bg: "#dbeafe" },
  en_validation: { label: "En validation", color: "#6b21a8", bg: "#f3e8ff" },
  approuve: { label: "Approuve", color: "#065f46", bg: "#d1fae5" },
  rejete: { label: "Rejete", color: "#991b1b", bg: "#fee2e2" },
  expire: { label: "Expire", color: "#4b5563", bg: "#f3f4f6" },
  // Inspections
  conforme: { label: "Conforme", color: "#065f46", bg: "#d1fae5" },
  non_conforme: { label: "Non conforme", color: "#991b1b", bg: "#fee2e2" },
  partiel: { label: "Partiellement conforme", color: "#92400e", bg: "#fef3c7" },
  // Generic
  active: { label: "Actif", color: "#065f46", bg: "#d1fae5" },
  inactive: { label: "Inactif", color: "#4b5563", bg: "#f3f4f6" },
  open: { label: "Ouvert", color: "#1e40af", bg: "#dbeafe" },
  closed: { label: "Ferme", color: "#4b5563", bg: "#f3f4f6" },
};

export function StatusBadge({ statut, size = "md" }: StatusBadgeProps) {
  const config = STATUT_CONFIG[statut] || {
    label: statut.replace(/_/g, " "),
    color: "#4b5563",
    bg: "#f3f4f6",
  };

  const fontSize = size === "sm" ? "0.68rem" : "0.78rem";
  const padding = size === "sm" ? "0.1rem 0.4rem" : "0.2rem 0.6rem";

  return (
    <span
      style={{
        display: "inline-block",
        padding,
        borderRadius: "999px",
        backgroundColor: config.bg,
        color: config.color,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        textTransform: "capitalize",
      }}
    >
      {config.label}
    </span>
  );
}
