"use client";

import { useState } from "react";
import Link from "next/link";
import { BulkActions } from "./BulkActions";
import { WorkflowButtons } from "./components/WorkflowButton";

interface ATI {
  id: string;
  numero_ati: string;
  type_activite: string;
  secteur: string;
  statut: string;
  priorite: string;
  etape: string;
  instructeur_username: string | null;
  date_soumission: string;
  age_jours: number;
  is_overdue: boolean;
}

const STATUT_LABELS: Record<string, string> = {
  soumis: "Soumis",
  en_instruction: "En instruction",
  en_validation: "En validation",
  approuve: "Approuve",
  rejete: "Rejete",
  expire: "Expire",
};
const STATUT_COLORS: Record<string, string> = {
  soumis: "#f59e0b",
  en_instruction: "#3b82f6",
  en_validation: "#8b5cf6",
  approuve: "#10b981",
  rejete: "#ef4444",
  expire: "#9ca3af",
};
const PRIORITE_COLORS: Record<string, string> = {
  normale: "#6b7280",
  elevee: "#f59e0b",
  urgente: "#ef4444",
};
const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois",
  mines: "Mines",
  agroalimentaire: "Agro",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};

export function ATITableWithSelection({ atis }: { atis: ATI[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleAll = () => {
    if (selected.length === atis.length) setSelected([]);
    else setSelected(atis.map((a) => a.id));
  };

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <>
      {atis.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem 0" }}>
          Aucun ATI trouve avec ces filtres.
        </p>
      ) : (
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selected.length === atis.length && atis.length > 0}
                    onChange={toggleAll}
                    aria-label="Selectionner tout"
                  />
                </th>
                {[
                  "Numero ATI",
                  "Secteur",
                  "Statut",
                  "Priorite",
                  "Instructeur",
                  "Age (j)",
                  "SLA",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "left",
                      color: "#6b7280",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atis.map((ati) => (
                <tr
                  key={ati.id}
                  style={{
                    borderBottom: "1px solid #f9fafb",
                    background: selected.includes(ati.id)
                      ? "rgba(0,63,143,0.06)"
                      : ati.is_overdue
                        ? "#fef9eb"
                        : "transparent",
                  }}
                >
                  <td style={{ padding: "0.625rem 0.5rem", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(ati.id)}
                      onChange={() => toggle(ati.id)}
                      aria-label={`Selectionner ${ati.numero_ati}`}
                    />
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>
                    <Link
                      href={`/pnpi/ati/${ati.id}`}
                      style={{
                        fontWeight: 700,
                        color: "#003F8F",
                        fontFamily: "monospace",
                        fontSize: "0.78rem",
                        textDecoration: "none",
                      }}
                    >
                      {ati.numero_ati}
                    </Link>
                    <div style={{ color: "#6b7280", fontSize: "0.72rem", marginTop: "0.1rem" }}>
                      {ati.type_activite.slice(0, 40)}
                      {ati.type_activite.length > 40 ? "..." : ""}
                    </div>
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem", color: "#374151" }}>
                    {SECTEUR_LABELS[ati.secteur] ?? ati.secteur}
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "999px",
                        background: `${STATUT_COLORS[ati.statut] ?? "#6b7280"}18`,
                        color: STATUT_COLORS[ati.statut] ?? "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.7rem",
                      }}
                    >
                      {STATUT_LABELS[ati.statut] ?? ati.statut}
                    </span>
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>
                    <span
                      style={{
                        color: PRIORITE_COLORS[ati.priorite] ?? "#6b7280",
                        fontWeight: ati.priorite === "urgente" ? 700 : 500,
                        textTransform: "capitalize",
                        fontSize: "0.8rem",
                      }}
                    >
                      {ati.priorite}
                    </span>
                  </td>
                  <td
                    style={{ padding: "0.625rem 0.75rem", color: "#6b7280", fontSize: "0.78rem" }}
                  >
                    {ati.instructeur_username ?? "·"}
                  </td>
                  <td
                    style={{
                      padding: "0.625rem 0.75rem",
                      fontWeight: 600,
                      color: ati.age_jours > 30 ? "#d97706" : "#374151",
                      textAlign: "right",
                    }}
                  >
                    {ati.age_jours}
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem", textAlign: "center" }}>
                    {ati.is_overdue ? (
                      <span
                        style={{
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          background: "#fef3c7",
                          color: "#d97706",
                          fontWeight: 700,
                          fontSize: "0.68rem",
                        }}
                      >
                        RETARD
                      </span>
                    ) : (
                      <span style={{ color: "#10b981", fontSize: "0.72rem", fontWeight: 600 }}>
                        OK
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>
                    <WorkflowButtons atiId={ati.id} currentStatut={ati.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BulkActions selectedIds={selected} onClear={() => setSelected([])} />
    </>
  );
}
