"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

interface Delegation {
  id: string; from: string; to: string; reason: string | null;
  start_date: string; end_date: string; is_active: boolean;
}

export default function DelegationsPage() {
  const { showToast } = useToast();
  const [given, setGiven] = useState<Delegation[]>([]);
  const [received, setReceived] = useState<Delegation[]>([]);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/delegations/my").then(r => r.json()).then(d => {
      setGiven(d.given || []);
      setReceived(d.received || []);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!to || !startDate || !endDate) { showToast("Champs requis", "warning"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/delegations/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_username: to, reason, start_date: startDate, end_date: endDate }),
      });
      if (res.ok) { showToast("Delegation creee", "success"); setTo(""); setReason(""); load(); }
      else { const d = await res.json(); showToast(d.detail || "Erreur", "error"); }
    } catch { showToast("Erreur", "error"); }
    setCreating(false);
  };

  const cancel = async (id: string) => {
    await fetch(`/api/delegations/${id}/cancel`, { method: "PATCH" });
    load();
    showToast("Delegation annulee", "info");
  };

  const renderList = (list: Delegation[], type: "given" | "received") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {list.length === 0 && <p style={{ fontSize: 13, color: "var(--text-soft, #526175)" }}>Aucune delegation.</p>}
      {list.map((d) => (
        <div key={d.id} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", borderRadius: 12,
          background: d.is_active ? "rgba(0,98,51,0.04)" : "var(--bg-base, #f4f8fb)",
          border: `1.5px solid ${d.is_active ? "#006233" : "var(--line, #dce4ef)"}`,
          opacity: d.is_active ? 1 : 0.6,
        }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>{type === "given" ? `\u2192 ${d.to}` : `\u2190 ${d.from}`}</span>
            {d.reason && <span style={{ color: "var(--text-soft, #526175)" }}> · {d.reason}</span>}
            <div style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)", marginTop: 2 }}>
              {new Date(d.start_date).toLocaleDateString("fr-FR")} · {new Date(d.end_date).toLocaleDateString("fr-FR")}
            </div>
          </div>
          <span style={{
            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: d.is_active ? "#dcfce7" : "#f3f4f6",
            color: d.is_active ? "#006233" : "#526175",
          }}>
            {d.is_active ? "Active" : "Annulee"}
          </span>
          {d.is_active && type === "given" && (
            <button onClick={() => cancel(d.id)} style={{
              padding: "4px 10px", borderRadius: 6, border: "none",
              background: "#fef2f2", color: "#b42318", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>Annuler</button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Delegations</h1>

      {/* Create form */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Nouvelle delegation</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="Destinataire (username)"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13 }} />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motif (optionnel)"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13 }} />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13 }} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 13 }} />
        </div>
        <button onClick={create} disabled={creating} style={{
          marginTop: 10, padding: "8px 20px", borderRadius: 10, border: "none",
          background: "#006233", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>{creating ? "Creation..." : "Creer"}</button>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Delegations donnees</h3>
      {renderList(given, "given")}

      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "20px 0 10px" }}>Delegations recues</h3>
      {renderList(received, "received")}
    </div>
  );
}
