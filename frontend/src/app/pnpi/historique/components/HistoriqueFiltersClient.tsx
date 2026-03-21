"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontSize: "0.8rem",
  background: "#fff",
  minWidth: "140px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#6b7280",
  fontWeight: 600,
  marginBottom: "0.15rem",
};

const ACTION_TYPES = [
  { value: "", label: "Tous les statuts" },
  { value: "soumis", label: "Soumis" },
  { value: "en_instruction", label: "En instruction" },
  { value: "en_validation", label: "En validation" },
  { value: "approuve", label: "Approuve" },
  { value: "rejete", label: "Rejete" },
  { value: "expire", label: "Expire" },
];

interface Props {
  acteur: string;
  dateFrom: string;
  dateTo: string;
  atiNumero: string;
  actionType: string;
}

export function HistoriqueFiltersClient({ acteur, dateFrom, dateTo, atiNumero, actionType }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localActeur, setLocalActeur] = useState(acteur);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [localAtiNumero, setLocalAtiNumero] = useState(atiNumero);
  const [localActionType, setLocalActionType] = useState(actionType);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (localActeur.trim()) params.set("acteur", localActeur.trim());
    if (localDateFrom) params.set("date_from", localDateFrom);
    if (localDateTo) params.set("date_to", localDateTo);
    if (localAtiNumero.trim()) params.set("ati_numero", localAtiNumero.trim());
    if (localActionType) params.set("action_type", localActionType);
    // Reset to page 1 on new search
    const q = params.toString();
    router.push(`${pathname}${q ? "?" + q : ""}`);
  }, [pathname, router, localActeur, localDateFrom, localDateTo, localAtiNumero, localActionType]);

  const reset = useCallback(() => {
    setLocalActeur("");
    setLocalDateFrom("");
    setLocalDateTo("");
    setLocalAtiNumero("");
    setLocalActionType("");
    router.push(pathname);
  }, [pathname, router]);

  const hasFilters = acteur || dateFrom || dateTo || atiNumero || actionType;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        {/* Date range */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={labelStyle}>Date debut</span>
          <input
            type="date"
            value={localDateFrom}
            onChange={(e) => setLocalDateFrom(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={labelStyle}>Date fin</span>
          <input
            type="date"
            value={localDateTo}
            onChange={(e) => setLocalDateTo(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* ATI numero */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={labelStyle}>N° ATI</span>
          <input
            type="text"
            placeholder="ATI-2025-..."
            value={localAtiNumero}
            onChange={(e) => setLocalAtiNumero(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
            style={inputStyle}
          />
        </div>

        {/* Acteur */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={labelStyle}>Acteur</span>
          <input
            type="text"
            placeholder="Filtrer par acteur..."
            value={localActeur}
            onChange={(e) => setLocalActeur(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
            style={inputStyle}
          />
        </div>

        {/* Action type */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={labelStyle}>Type de statut</span>
          <select
            value={localActionType}
            onChange={(e) => setLocalActionType(e.target.value)}
            style={{ ...inputStyle, minWidth: "160px" }}
          >
            {ACTION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          onClick={apply}
          style={{
            padding: "0.4rem 0.7rem",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "0.78rem",
            background: "#003F8F",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Rechercher
        </button>
        {hasFilters && (
          <button
            onClick={reset}
            style={{
              padding: "0.4rem 0.7rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              fontSize: "0.78rem",
              background: "#fef2f2",
              color: "#b42318",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
