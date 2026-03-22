"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

interface StickyNote {
  id: string; content: string; color: string;
  position_x: number; position_y: number;
  is_pinned: boolean; updated_at: string;
}

const COLORS = ["#f2b800", "#0c7eb4", "#006233", "#b42318", "#7c3aed", "#059669", "#ec4899", "#f97316"];

export default function NotesPage() {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("#f2b800");

  const load = () => {
    fetch("/api/notes/my").then(r => r.json()).then(d => setNotes(d.notes || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newContent.trim()) return;
    await fetch("/api/notes/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, color: newColor }),
    });
    setNewContent("");
    load();
    showToast("Note ajoutee", "success");
  };

  const remove = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    load();
  };

  const update = async (id: string, content: string) => {
    await fetch(`/api/notes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>Mes notes</h1>

      {/* Create form */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "flex-start" }}>
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="Nouvelle note..."
          rows={2}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            border: "1.5px solid var(--line, #dce4ef)", fontSize: 13, resize: "vertical",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)} style={{
                width: 16, height: 16, borderRadius: 4, background: c,
                border: newColor === c ? "2px solid #000" : "1px solid #dce4ef",
                cursor: "pointer", padding: 0,
              }} />
            ))}
          </div>
          <button onClick={create} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#006233", color: "#fff", fontWeight: 600,
            fontSize: 12, cursor: "pointer",
          }}>+ Ajouter</button>
        </div>
      </div>

      {/* Notes grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}>
        {notes.map(note => (
          <div key={note.id} style={{
            padding: "14px 16px", borderRadius: 14,
            background: `${note.color}18`,
            borderLeft: `4px solid ${note.color}`,
            minHeight: 100, position: "relative",
          }}>
            <textarea
              defaultValue={note.content}
              onBlur={e => update(note.id, e.target.value)}
              style={{
                width: "100%", background: "transparent", border: "none",
                fontSize: 13, lineHeight: 1.5, resize: "none",
                minHeight: 60, outline: "none",
                color: "var(--text-main, #0c2a4a)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)" }}>
                {new Date(note.updated_at).toLocaleDateString("fr-FR")}
              </span>
              <button onClick={() => remove(note.id)} style={{
                background: "none", border: "none", color: "var(--text-soft, #9ca3af)",
                cursor: "pointer", fontSize: 14,
              }}>×</button>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-soft, #9ca3af)", gridColumn: "1 / -1" }}>
            Aucune note. Ajoutez-en une ci-dessus.
          </div>
        )}
      </div>
    </div>
  );
}
