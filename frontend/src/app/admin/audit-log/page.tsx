"use client";

import { useState, useEffect } from "react";

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  "ati.": "#0c7eb4",
  "inspection.": "#006233",
  "auth.": "#d97706",
  "admin.": "#b42318",
  "export.": "#7c3aed",
};

function getActionColor(action: string): string {
  for (const [prefix, color] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(prefix)) return color;
  }
  return "#526175";
}

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    actor: "", action: "", target: "", date_start: "", date_end: "",
  });
  const [page, setPage] = useState(0);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("skip", String(page * limit));
    params.set("limit", String(limit));
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.action) params.set("action", filters.action);
    if (filters.target) params.set("target", filters.target);
    if (filters.date_start) params.set("date_start", filters.date_start);
    if (filters.date_end) params.set("date_end", filters.date_end);

    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const search = () => { setPage(0); load(); };

  const exportCsv = () => {
    const headers = ["Date", "Acteur", "Action", "Cible", "Details"];
    const rows = events.map((e) => [
      new Date(e.created_at).toLocaleString("fr-FR"),
      e.actor, e.action, e.target, e.details,
    ].join(";"));
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Journal d'audit</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-soft, #526175)" }}>
            {total} evenement(s)
          </p>
        </div>
        <button onClick={exportCsv}
          style={{ padding: "8px 18px", borderRadius: 10, border: "1.5px solid var(--line, #dce4ef)", background: "transparent", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="chart-card" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Acteur</label>
          <input value={filters.actor} onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
            placeholder="Username" style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13, width: 130 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Action</label>
          <input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="ati., auth., etc." style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13, width: 130 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Cible</label>
          <input value={filters.target} onChange={(e) => setFilters({ ...filters, target: e.target.value })}
            placeholder="ID ou nom" style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13, width: 130 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Debut</label>
          <input type="date" value={filters.date_start} onChange={(e) => setFilters({ ...filters, date_start: e.target.value })}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Fin</label>
          <input type="date" value={filters.date_end} onChange={(e) => setFilters({ ...filters, date_end: e.target.value })}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13 }} />
        </div>
        <button onClick={search}
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "#006233", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Rechercher
        </button>
      </div>

      {/* Table */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="annex-table" style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td style={{ fontWeight: 600 }}>{e.actor}</td>
                  <td>
                    <span style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: `${getActionColor(e.action)}12`,
                      color: getActionColor(e.action),
                    }}>
                      {e.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.target}
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.details}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-soft, #526175)" }}>Aucun evenement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14 }}>
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", background: "var(--bg-layer, #fff)", cursor: "pointer", opacity: page === 0 ? 0.4 : 1 }}>
            Precedent
          </button>
          <span style={{ padding: "6px 0", fontSize: 13, color: "var(--text-soft, #526175)" }}>
            Page {page + 1} / {Math.ceil(total / limit)}
          </span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= total}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", background: "var(--bg-layer, #fff)", cursor: "pointer", opacity: (page + 1) * limit >= total ? 0.4 : 1 }}>
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
