"use client";

import { CSSProperties, useMemo, useState } from "react";

import { ProjectDossier } from "../../lib/api";

interface Props {
  dossiers: ProjectDossier[];
}

export const PilotageExportFilters = ({ dossiers }: Props) => {
  const [dossierId, setDossierId] = useState("");
  const [actor, setActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDownloading, setIsDownloading] = useState<"csv" | "pdf" | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (dossierId) params.set("dossier_id", dossierId);
    if (actor) params.set("changed_by", actor);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    return params.toString();
  }, [actor, dateFrom, dateTo, dossierId]);

  const csvUrl = query
    ? `/api/exports/pilotage-transitions?${query}`
    : "/api/exports/pilotage-transitions";
  const pdfUrl = query
    ? `/api/exports/pilotage-transitions-pdf?${query}`
    : "/api/exports/pilotage-transitions-pdf";

  const downloadExport = async (format: "csv" | "pdf") => {
    const url = format === "csv" ? csvUrl : pdfUrl;
    setFeedback("");
    setIsDownloading(format);
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Export indisponible (${response.status})`);
      }

      const disposition = response.headers.get("content-disposition") ?? "";
      const matched = disposition.match(/filename="?([^"]+)"?/i);
      const fallback = `pilotage-transitions.${format}`;
      const fileName = matched?.[1] ?? fallback;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setFeedback(`Export ${format.toUpperCase()} telecharge : ${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setFeedback(`Echec export ${format.toUpperCase()} : ${message}`);
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: "0.65rem" }}>
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
        <select
          value={dossierId}
          onChange={(event) => setDossierId(event.target.value)}
          style={fieldStyle}
        >
          <option value="">Tous les dossiers</option>
          {dossiers.map((dossier) => (
            <option key={dossier.id} value={dossier.id}>
              {dossier.id}
            </option>
          ))}
        </select>

        <input
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          placeholder="Acteur (ex: ministere)"
          style={fieldStyle}
        />

        <input
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          type="date"
          style={fieldStyle}
        />

        <input
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          type="date"
          style={fieldStyle}
        />
      </div>

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="export-link"
          onClick={() => void downloadExport("csv")}
          disabled={isDownloading !== null}
        >
          Export CSV des transitions
        </button>
        <button
          type="button"
          className="export-link"
          onClick={() => void downloadExport("pdf")}
          disabled={isDownloading !== null}
        >
          Export PDF des transitions
        </button>
      </div>
      {isDownloading && (
        <p style={{ margin: 0, color: "#3a4351", fontSize: "0.9rem" }}>
          Export {isDownloading.toUpperCase()} en cours...
        </p>
      )}
      {feedback && (
        <p
          style={{
            margin: 0,
            color: feedback.startsWith("Echec") ? "#b42318" : "#1f7a3f",
            fontSize: "0.9rem",
          }}
        >
          {feedback}
        </p>
      )}
    </div>
  );
};

const fieldStyle: CSSProperties = {
  minWidth: 180,
  borderRadius: 10,
  border: "1px solid #d0ddec",
  padding: "0.5rem 0.6rem",
  fontSize: "0.9rem",
};
