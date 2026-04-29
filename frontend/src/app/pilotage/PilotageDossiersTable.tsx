"use client";

import { useMemo, useState } from "react";

import { ProjectDossier } from "../../lib/api";

interface Props {
  dossiers: ProjectDossier[];
}

type SortKey = "updated_at" | "id" | "company_name" | "status" | "stage" | "priority" | "age_days";

const statusLabel = (status: string) => {
  switch (status) {
    case "submitted":
      return "Soumis";
    case "under_review":
      return "En instruction";
    case "interministerial":
      return "Interministeriel";
    case "approved":
      return "Approuve";
    case "rejected":
      return "Rejete";
    default:
      return status;
  }
};

const stageLabel = (stage: string) => {
  switch (stage) {
    case "reception":
      return "Reception";
    case "instruction":
      return "Instruction";
    case "validation":
      return "Validation";
    case "decision":
      return "Decision";
    default:
      return stage;
  }
};

const priorityLabel = (priority: string) => {
  switch (priority) {
    case "low":
      return "Basse";
    case "medium":
      return "Moyenne";
    case "high":
      return "Haute";
    default:
      return priority;
  }
};

export const PilotageDossiersTable = ({ dossiers }: Props) => {
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sorted = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = dossiers.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) {
        return false;
      }
      if (onlyOverdue && !entry.is_overdue) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack =
        `${entry.id} ${entry.company_name} ${entry.project_title} ${entry.sector} ${entry.location} ${entry.assigned_to ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    const copy = [...filtered];
    copy.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const cmp =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left ?? "").localeCompare(String(right ?? ""));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [dossiers, onlyOverdue, search, sortDirection, sortKey, statusFilter]);

  const maxPage = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, maxPage);
  const offset = (safePage - 1) * pageSize;
  const rows = sorted.slice(offset, offset + pageSize);

  const onSort = (key: SortKey) => {
    setPage(1);
    if (sortKey == key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  return (
    <div className="table-card reveal" style={{ marginTop: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "0.4rem" }}>File des dossiers industriels</h3>
        <span style={{ fontSize: "0.85rem", color: "#6c7482" }}>
          Tri: {sortKey} ({sortDirection === "asc" ? "croissant" : "decroissant"}) | Page {safePage}
          /{maxPage}
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Recherche texte"
          style={{
            border: "1px solid #d0ddec",
            borderRadius: 10,
            padding: "0.45rem 0.6rem",
            minWidth: 220,
          }}
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setPage(1);
            setStatusFilter(event.target.value);
          }}
          style={{ border: "1px solid #d0ddec", borderRadius: 10, padding: "0.45rem 0.6rem" }}
        >
          <option value="all">Statut: tous</option>
          <option value="submitted">Statut: soumis</option>
          <option value="under_review">Statut: en instruction</option>
          <option value="interministerial">Statut: interministeriel</option>
          <option value="approved">Statut: approuve</option>
          <option value="rejected">Statut: rejete</option>
        </select>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          <input
            type="checkbox"
            checked={onlyOverdue}
            onChange={(event) => {
              setPage(1);
              setOnlyOverdue(event.target.checked);
            }}
          />
          Hors SLA uniquement
        </label>
      </div>

      <div className="table-scroll">
        <table className="annex-table">
          <thead>
            <tr>
              <Header label="ID" onClick={() => onSort("id")} />
              <Header label="Entreprise" onClick={() => onSort("company_name")} />
              <th>Projet</th>
              <Header label="Statut" onClick={() => onSort("status")} />
              <Header label="Etape" onClick={() => onSort("stage")} />
              <Header label="Priorite" onClick={() => onSort("priority")} />
              <Header label="Age" onClick={() => onSort("age_days")} />
              <th>SLA</th>
              <Header label="Maj" onClick={() => onSort("updated_at")} />
              <th>Assignation</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((dossier) => (
              <tr key={dossier.id}>
                <td>{dossier.id}</td>
                <td>{dossier.company_name}</td>
                <td>{dossier.project_title}</td>
                <td>{statusLabel(dossier.status)}</td>
                <td>{stageLabel(dossier.stage)}</td>
                <td>{priorityLabel(dossier.priority)}</td>
                <td style={{ color: dossier.is_overdue ? "#b42318" : "inherit" }}>
                  {dossier.age_days} j
                </td>
                <td>{dossier.sla_days} j</td>
                <td>{new Date(dossier.updated_at).toLocaleDateString("fr-FR")}</td>
                <td>
                  {dossier.assigned_to ?? "Non renseigne"} (
                  {dossier.assigned_role ?? "Non renseigne"})
                </td>
                <td>
                  {["approved", "rejected"].includes(dossier.status) ? (
                    <a
                      className="export-link"
                      href={`/api/pilotage/dossiers/${encodeURIComponent(
                        dossier.id,
                      )}/decision-document.pdf`}
                    >
                      PDF
                    </a>
                  ) : (
                    "Non disponible"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem" }}>
        <button className="export-link" onClick={() => setPage((value) => Math.max(1, value - 1))}>
          Precedent
        </button>
        <button
          className="export-link"
          onClick={() => setPage((value) => Math.min(maxPage, value + 1))}
        >
          Suivant
        </button>
      </div>
    </div>
  );
};

const Header = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <th>
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        fontWeight: 700,
        color: "#0f2f64",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  </th>
);
