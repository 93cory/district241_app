import type { ReactNode } from "react";

type IllustrationKind =
  | "inbox"
  | "search"
  | "documents"
  | "operators"
  | "inspections"
  | "stats"
  | "error"
  | "calendar"
  | "messages";

interface EmptyStateProps {
  title?: string;
  message?: string;
  illustration?: IllustrationKind;
  /** @deprecated utiliser illustration */
  icon?: string;
  action?: ReactNode;
}

const COLORS = {
  green: "#009E60",
  yellow: "#FCD116",
  blue: "#003DA5",
  ink: "#051B36",
  soft: "#94a3b8",
  paper: "#f1f5f9",
};

function Illustration({ kind }: { kind: IllustrationKind }) {
  const c = COLORS;
  switch (kind) {
    case "inbox":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <path
            d="M20 50 L40 30 L80 30 L100 50 L100 80 Q100 88 92 88 L28 88 Q20 88 20 80 Z"
            fill="#fff"
            stroke={c.blue}
            strokeWidth="2"
          />
          <path
            d="M20 50 L48 50 L52 60 L68 60 L72 50 L100 50"
            fill="none"
            stroke={c.blue}
            strokeWidth="2"
          />
          <rect x="40" y="30" width="40" height="20" fill={c.yellow} opacity="0.25" />
          <circle cx="86" cy="32" r="8" fill={c.green} />
          <text
            x="86"
            y="36"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#fff"
            fontFamily="sans-serif"
          >
            0
          </text>
        </svg>
      );
    case "search":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <circle cx="52" cy="52" r="28" fill="#fff" stroke={c.blue} strokeWidth="3" />
          <line
            x1="74"
            y1="74"
            x2="92"
            y2="92"
            stroke={c.blue}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="52" cy="52" r="22" fill={c.yellow} opacity="0.2" />
          <path
            d="M40 52 L46 58 L66 38"
            fill="none"
            stroke={c.green}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />
        </svg>
      );
    case "documents":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <rect
            x="32"
            y="20"
            width="48"
            height="64"
            rx="4"
            fill="#fff"
            stroke={c.blue}
            strokeWidth="2"
            transform="rotate(-6 56 52)"
          />
          <rect
            x="40"
            y="28"
            width="48"
            height="64"
            rx="4"
            fill="#fff"
            stroke={c.blue}
            strokeWidth="2"
          />
          <line x1="48" y1="44" x2="80" y2="44" stroke={c.soft} strokeWidth="2" />
          <line x1="48" y1="54" x2="80" y2="54" stroke={c.soft} strokeWidth="2" />
          <line x1="48" y1="64" x2="68" y2="64" stroke={c.soft} strokeWidth="2" />
          <circle cx="78" cy="80" r="10" fill={c.green} />
          <path
            d="M73 80 L77 84 L84 76"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "operators":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <rect x="28" y="40" width="22" height="48" fill="#fff" stroke={c.blue} strokeWidth="2" />
          <rect x="50" y="28" width="22" height="60" fill="#fff" stroke={c.blue} strokeWidth="2" />
          <rect x="72" y="48" width="22" height="40" fill="#fff" stroke={c.blue} strokeWidth="2" />
          <rect x="56" y="34" width="4" height="6" fill={c.green} />
          <rect x="62" y="34" width="4" height="6" fill={c.yellow} />
          <rect x="56" y="44" width="4" height="6" fill={c.green} />
          <rect x="62" y="44" width="4" height="6" fill={c.yellow} />
          <rect x="34" y="54" width="4" height="5" fill={c.green} opacity="0.6" />
          <rect x="40" y="54" width="4" height="5" fill={c.yellow} opacity="0.6" />
          <rect x="78" y="58" width="4" height="5" fill={c.green} opacity="0.6" />
          <rect x="84" y="58" width="4" height="5" fill={c.yellow} opacity="0.6" />
        </svg>
      );
    case "inspections":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <path
            d="M60 24 C44 24 32 36 32 52 C32 70 60 92 60 92 C60 92 88 70 88 52 C88 36 76 24 60 24 Z"
            fill="#fff"
            stroke={c.blue}
            strokeWidth="2"
          />
          <circle cx="60" cy="52" r="12" fill={c.green} />
          <circle cx="60" cy="52" r="5" fill="#fff" />
        </svg>
      );
    case "stats":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <rect
            x="24"
            y="28"
            width="72"
            height="60"
            rx="4"
            fill="#fff"
            stroke={c.blue}
            strokeWidth="2"
          />
          <rect x="32" y="60" width="10" height="20" fill={c.green} opacity="0.7" />
          <rect x="46" y="48" width="10" height="32" fill={c.yellow} opacity="0.85" />
          <rect x="60" y="38" width="10" height="42" fill={c.blue} opacity="0.7" />
          <rect x="74" y="54" width="10" height="26" fill={c.green} opacity="0.5" />
          <line x1="32" y1="80" x2="88" y2="80" stroke={c.ink} strokeWidth="1.5" />
        </svg>
      );
    case "error":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <circle cx="60" cy="56" r="32" fill="#fef2f2" stroke="#b42318" strokeWidth="2" />
          <line
            x1="48"
            y1="44"
            x2="72"
            y2="68"
            stroke="#b42318"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="72"
            y1="44"
            x2="48"
            y2="68"
            stroke="#b42318"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "calendar":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <rect
            x="28"
            y="32"
            width="64"
            height="56"
            rx="4"
            fill="#fff"
            stroke={c.blue}
            strokeWidth="2"
          />
          <rect x="28" y="32" width="64" height="14" fill={c.blue} />
          <rect x="38" y="24" width="4" height="14" rx="1" fill={c.ink} />
          <rect x="78" y="24" width="4" height="14" rx="1" fill={c.ink} />
          <circle cx="44" cy="58" r="3" fill={c.soft} />
          <circle cx="60" cy="58" r="3" fill={c.green} />
          <circle cx="76" cy="58" r="3" fill={c.soft} />
          <circle cx="44" cy="72" r="3" fill={c.soft} />
          <circle cx="60" cy="72" r="3" fill={c.soft} />
          <circle cx="76" cy="72" r="3" fill={c.yellow} />
        </svg>
      );
    case "messages":
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="100" rx="48" ry="6" fill={c.paper} />
          <path
            d="M28 36 L92 36 Q96 36 96 40 L96 72 Q96 76 92 76 L66 76 L60 86 L54 76 L28 76 Q24 76 24 72 L24 40 Q24 36 28 36 Z"
            fill="#fff"
            stroke={c.blue}
            strokeWidth="2"
          />
          <line x1="36" y1="50" x2="84" y2="50" stroke={c.soft} strokeWidth="2" />
          <line x1="36" y1="60" x2="68" y2="60" stroke={c.soft} strokeWidth="2" />
        </svg>
      );
  }
}

export function EmptyState({
  title = "Aucun résultat",
  message = "Aucune donnée à afficher pour le moment.",
  illustration = "inbox",
  icon,
  action,
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
        color: "var(--text-secondary, #526175)",
      }}
    >
      {icon ? (
        <span style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{icon}</span>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          <Illustration kind={illustration} />
        </div>
      )}
      <h3
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--text-primary, #051B36)",
          marginBottom: "0.5rem",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.9rem",
          maxWidth: "420px",
          lineHeight: 1.6,
          marginBottom: action ? "1.25rem" : 0,
        }}
      >
        {message}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
