"use client";

import { useState, useEffect, useCallback } from "react";

interface Tag {
  id: string;
  label: string;
  color: string;
  created_by: string;
}

const PRESET_COLORS = [
  "#006233",
  "#0c7eb4",
  "#7c3aed",
  "#b42318",
  "#d97706",
  "#059669",
  "#dc2626",
  "#2563eb",
];

export function TagsManager({ atiId }: { atiId: string }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#0c7eb4");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/pnpi/ati/${atiId}/tags`)
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((d) => setTags(d.tags || []))
      .catch(() => {});
  }, [atiId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/pnpi/ati/${atiId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), color: newColor }),
      });
      if (res.ok) {
        setNewLabel("");
        load();
      }
    } catch {}
    setAdding(false);
  };

  const remove = async (tagId: string) => {
    await fetch(`/api/pnpi/ati/tags/${tagId}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {tags.map((tag) => (
          <span
            key={tag.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 8,
              background: `${tag.color}15`,
              color: tag.color,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {tag.label}
            <button
              onClick={() => remove(tag.id)}
              style={{
                background: "none",
                border: "none",
                color: tag.color,
                cursor: "pointer",
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
              aria-label={`Supprimer le tag ${tag.label}`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)" }}>Aucun tag</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nouveau tag..."
          maxLength={50}
          style={{
            padding: "5px 10px",
            borderRadius: 8,
            fontSize: 12,
            border: "1px solid var(--line, #dce4ef)",
            width: 130,
          }}
        />
        <div style={{ display: "flex", gap: 3 }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: c,
                border: newColor === c ? "2px solid #000" : "1px solid #dce4ef",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label={`Couleur ${c}`}
            />
          ))}
        </div>
        <button
          onClick={add}
          disabled={adding || !newLabel.trim()}
          style={{
            padding: "4px 12px",
            borderRadius: 8,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            opacity: adding || !newLabel.trim() ? 0.5 : 1,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
