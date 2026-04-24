"use client";

import { useState } from "react";

interface Stage { stage: string; raci: Record<string, string>; }
interface RaciData { roles: string[]; stages: Stage[]; }

const LEVELS = ["", "R", "A", "C", "I"];
const LEVEL_COLORS: Record<string, string> = {
  R: "#DC2626", A: "#1E3A8A", C: "#D97706", I: "#6B7280",
};

export function RaciEditor({ initial, canEdit }: { initial: RaciData; canEdit: boolean }) {
  const [data, setData] = useState<RaciData>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const cycle = (stageIdx: number, role: string) => {
    const current = data.stages[stageIdx].raci[role] ?? "";
    const next = LEVELS[(LEVELS.indexOf(current) + 1) % LEVELS.length];
    setData((d) => {
      const stages = [...d.stages];
      stages[stageIdx] = {
        ...stages[stageIdx],
        raci: { ...stages[stageIdx].raci, [role]: next },
      };
      return { ...d, stages };
    });
    setDirty(true);
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/raci", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setDirty(false);
        setMsg("Matrice sauvegardee.");
      } else {
        setMsg("Erreur de sauvegarde.");
      }
    } catch {
      setMsg("Erreur reseau.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const reset = () => { setData(initial); setDirty(false); };

  return (
    <div className="raci-editor">
      <div className="table-scroll">
        <table className="annex-table raci-table">
          <thead>
            <tr>
              <th>Etape du processus</th>
              {data.roles.map((r) => <th key={r} className="raci-role-head">{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.stages.map((s, i) => (
              <tr key={s.stage}>
                <td><strong>{s.stage}</strong></td>
                {data.roles.map((role) => {
                  const v = s.raci[role] ?? "";
                  return (
                    <td key={role} className="raci-cell">
                      {canEdit ? (
                        <button
                          type="button"
                          className={`raci-level raci-level-${v || "empty"}`}
                          onClick={() => cycle(i, role)}
                          aria-label={`${role} / ${s.stage}`}
                          style={{ color: v ? LEVEL_COLORS[v] : "transparent" }}
                        >
                          {v || "·"}
                        </button>
                      ) : (
                        <span className={`raci-level raci-level-${v || "empty"}`} style={{ color: v ? LEVEL_COLORS[v] : "transparent" }}>
                          {v || "·"}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="pnpi-form-actions pnpi-form-actions--between">
          <span className="pnpi-page-sub" style={{ margin: 0 }}>
            Cliquez sur une cellule pour cycler entre <strong>· → R → A → C → I → ·</strong>.
            {msg && <> &middot; <strong>{msg}</strong></>}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {dirty && (
              <button type="button" className="btn-secondary" onClick={reset} disabled={busy}>
                Annuler
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={save}
              disabled={!dirty || busy}
            >
              {busy ? "Sauvegarde..." : dirty ? "Sauvegarder la matrice" : "Sauvegarde"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
