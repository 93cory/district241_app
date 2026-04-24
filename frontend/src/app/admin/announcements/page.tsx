"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

interface Ann { id: string; title: string; body: string; severity: string; target_roles: string | null; is_active: boolean; created_by: string; created_at: string; }

export default function AnnouncementsPage() {
  const { showToast } = useToast();
  const [list, setList] = useState<Ann[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("info");
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/announcements/all").then(r => r.json()).then(d => setList(d.announcements || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title || !body) { showToast("Champs requis", "warning"); return; }
    setCreating(true);
    const res = await fetch("/api/announcements/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, severity }),
    });
    if (res.ok) { showToast("Annonce publiee", "success"); setTitle(""); setBody(""); load(); }
    else showToast("Erreur", "error");
    setCreating(false);
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/announcements/${id}/deactivate`, { method: "PATCH" });
    load();
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Annonces</h1>

      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Nouvelle annonce</h3>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre"
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, marginBottom: 8 }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Contenu..." rows={3}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, resize: "vertical", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {["info", "success", "warning", "critical"].map(s => (
            <button key={s} onClick={() => setSeverity(s)} style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
              background: severity === s ? "#006233" : "var(--bg-base)", color: severity === s ? "#fff" : "var(--text-soft)",
              textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
        <button onClick={create} disabled={creating} style={{
          padding: "8px 20px", borderRadius: 10, border: "none",
          background: "#006233", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>{creating ? "Publication..." : "Publier"}</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map(ann => (
          <div key={ann.id} style={{
            padding: "10px 14px", borderRadius: 10,
            background: ann.is_active ? "var(--bg-layer, #fff)" : "var(--bg-base)",
            border: "1px solid var(--line)", opacity: ann.is_active ? 1 : 0.5,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{ann.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{ann.body.slice(0, 100)}</div>
              <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)", marginTop: 2 }}>
                {ann.created_by} · {new Date(ann.created_at).toLocaleDateString("fr-FR")}
              </div>
            </div>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "capitalize",
              background: ann.severity === "critical" ? "#fef2f2" : ann.severity === "warning" ? "#fef3c7" : "#e0f2fe",
              color: ann.severity === "critical" ? "#b42318" : ann.severity === "warning" ? "#d97706" : "#0c7eb4",
            }}>{ann.severity}</span>
            {ann.is_active && (
              <button onClick={() => deactivate(ann.id)} style={{
                padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
                background: "#fef2f2", color: "#b42318", cursor: "pointer",
              }}>Retirer</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
