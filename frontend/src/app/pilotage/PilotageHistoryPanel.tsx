"use client";

import { useEffect, useMemo, useState } from "react";

import { ProjectDossier, ProjectDossierTransition } from "../../lib/api";

interface Props {
  dossiers: ProjectDossier[];
  initialTransitionsByDossier?: Record<string, ProjectDossierTransition[]>;
}

const statusLabel = (status: string | null) => {
  if (!status) return "Non renseigne";
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

export const PilotageHistoryPanel = ({ dossiers, initialTransitionsByDossier }: Props) => {
  const options = useMemo(() => dossiers.map((dossier) => dossier.id), [dossiers]);
  const [selectedId, setSelectedId] = useState(options[0] ?? "");
  const [history, setHistory] = useState<ProjectDossierTransition[]>(
    () => initialTransitionsByDossier?.[options[0] ?? ""] ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setHistory([]);
      return;
    }
    if (initialTransitionsByDossier) {
      setHistory(initialTransitionsByDossier[selectedId] ?? []);
      setError(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/pilotage/dossiers/history?dossier_id=${encodeURIComponent(selectedId)}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        setError(`Chargement historique echoue (${response.status}).`);
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as ProjectDossierTransition[];
      setHistory(payload);
      setLoading(false);
    };

    void load();
  }, [selectedId, initialTransitionsByDossier]);

  return (
    <div className="table-card reveal" style={{ marginTop: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>Historique des transitions de flux</h3>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="history-dossier">Dossier :</label>
        <select
          id="history-dossier"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          style={{ borderRadius: 10, border: "1px solid #d8dee7", padding: "0.45rem 0.55rem" }}
        >
          {options.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ marginTop: "0.8rem" }}>Chargement en cours...</p>
      ) : error ? (
        <p style={{ marginTop: "0.8rem", color: "#b42318" }}>{error}</p>
      ) : history.length == 0 ? (
        <p style={{ marginTop: "0.8rem" }}>Aucune transition disponible.</p>
      ) : (
        <div className="table-scroll" style={{ marginTop: "0.8rem" }}>
          <table className="annex-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Acteur</th>
                <th>Statut</th>
                <th>Etape</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.changed_at).toLocaleString("fr-FR")}</td>
                  <td>{entry.changed_by}</td>
                  <td>
                    {statusLabel(entry.previous_status)} {"->"} {statusLabel(entry.new_status)}
                  </td>
                  <td>
                    {entry.previous_stage ?? "Non renseigne"} {"->"} {entry.new_stage ?? "Non renseigne"}
                  </td>
                  <td>{entry.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
