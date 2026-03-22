"use client";

import { useState, useEffect } from "react";

interface Template {
  id: string;
  secteur: string;
  nom: string;
  description: string;
}

interface FullTemplate extends Template {
  type_activite: string;
  documents_requis: string[];
}

interface Props {
  onSelect: (tpl: FullTemplate) => void;
}

export function TemplateSelector({ onSelect }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [secteur, setSecteur] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = secteur ? `?secteur=${secteur}` : "";
    fetch(`/api/templates/list${params}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {});
  }, [secteur]);

  const select = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (res.ok) {
        const tpl = await res.json();
        onSelect(tpl);
        setOpen(false);
      }
    } catch {}
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 16px", borderRadius: 10,
          border: "1.5px dashed var(--accent, #006233)",
          background: "transparent", color: "var(--accent, #006233)",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}
      >
        Utiliser un modele pre-rempli
      </button>
    );
  }

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      border: "1.5px solid var(--accent, #006233)",
      background: "rgba(0, 98, 51, 0.03)", marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Choisir un modele</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
      </div>

      <select
        value={secteur}
        onChange={(e) => setSecteur(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #dce4ef)", fontSize: 12, marginBottom: 10, width: "100%" }}
      >
        <option value="">Tous les secteurs</option>
        <option value="bois">Bois</option>
        <option value="mines">Mines</option>
        <option value="agroalimentaire">Agroalimentaire</option>
        <option value="peche">Peche</option>
        <option value="chimie">Chimie</option>
        <option value="btp">BTP</option>
        <option value="energie">Energie</option>
      </select>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => select(tpl.id)}
            disabled={loading}
            style={{
              padding: "10px 14px", borderRadius: 10, textAlign: "left",
              border: "1px solid var(--line, #dce4ef)",
              background: "var(--bg-layer, #fff)", cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>{tpl.nom}</div>
            <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>{tpl.description}</div>
            <span style={{
              display: "inline-block", marginTop: 4, padding: "1px 8px",
              borderRadius: 4, fontSize: 10, fontWeight: 600,
              background: "var(--bg-base, #f4f8fb)",
            }}>
              {tpl.secteur}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
